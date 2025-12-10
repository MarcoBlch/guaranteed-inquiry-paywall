import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Reconciliation function to fix transactions where:
 * 1. Stripe transfer succeeded (stripe_transfer_id is set)
 * 2. But DB status is still 'processing' or 'transfer_failed'
 *
 * This handles the critical bug where transfer succeeds but DB update fails.
 *
 * Usage: Call manually or via cron when inconsistent state is detected
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

    // Find transactions with transfer ID but not in 'released' status
    // These are transactions where the Stripe transfer succeeded but DB update failed
    const { data: inconsistentTransactions, error: queryError } = await supabase
      .from('escrow_transactions')
      .select('*')
      .not('stripe_transfer_id', 'is', null)
      .not('status', 'eq', 'released')
      .in('status', ['processing', 'transfer_failed'])

    if (queryError) {
      throw new Error(`Failed to query inconsistent transactions: ${queryError.message}`)
    }

    console.log(`Found ${inconsistentTransactions?.length || 0} transactions requiring reconciliation`)

    const results = {
      total_found: inconsistentTransactions?.length || 0,
      successfully_reconciled: [] as string[],
      failed_reconciliation: [] as Array<{ id: string; error: string }>,
      already_refunded: [] as string[]
    }

    // Process each transaction
    for (const transaction of inconsistentTransactions || []) {
      console.log(`Reconciling transaction ${transaction.id}`, {
        stripe_transfer_id: transaction.stripe_transfer_id,
        current_status: transaction.status,
        amount: transaction.amount
      })

      // Verify the transfer still exists in Stripe
      const transferResponse = await fetch(`https://api.stripe.com/v1/transfers/${transaction.stripe_transfer_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      })

      if (!transferResponse.ok) {
        const error = await transferResponse.text()
        console.error(`Failed to verify transfer for transaction ${transaction.id}:`, error)
        results.failed_reconciliation.push({
          id: transaction.id,
          error: `Failed to verify Stripe transfer: ${error}`
        })
        continue
      }

      const transfer = await transferResponse.json()

      // Check if the transfer was actually successful
      if (transfer.reversed) {
        console.log(`Transfer ${transfer.id} was reversed - marking as refunded`)

        const { error: updateError } = await supabase
          .from('escrow_transactions')
          .update({
            status: 'refunded',
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.id)

        if (updateError) {
          results.failed_reconciliation.push({
            id: transaction.id,
            error: `Failed to update reversed transfer: ${updateError.message}`
          })
        } else {
          results.already_refunded.push(transaction.id)
        }
        continue
      }

      // Transfer exists and is valid - update status to 'released'
      const { error: updateError } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'released',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id)

      if (updateError) {
        console.error(`Failed to update transaction ${transaction.id} to released:`, updateError)
        results.failed_reconciliation.push({
          id: transaction.id,
          error: updateError.message
        })
      } else {
        console.log(`Successfully reconciled transaction ${transaction.id}`)
        results.successfully_reconciled.push(transaction.id)
      }
    }

    console.log('Reconciliation complete:', results)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reconciliation complete',
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error during reconciliation:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
