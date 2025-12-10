import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find all transactions that failed transfer and are ready for retry
    const { data: failedTransactions, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('status', 'transfer_failed')
      .order('updated_at', { ascending: true })
      .limit(10) // Process max 10 per run

    if (error) {
      console.error('Error fetching failed transactions:', error)
      throw error
    }

    console.log(`Found ${failedTransactions.length} failed transfers to retry`)

    let retriedCount = 0
    let successCount = 0
    let failedCount = 0

    for (const transaction of failedTransactions) {
      try {
        console.log(`Retrying transfer for transaction ${transaction.id}`)

        // Invoke distribute-escrow-funds to retry the transfer
        const { data, error: retryError } = await supabase.functions.invoke(
          'distribute-escrow-funds',
          {
            body: { escrowTransactionId: transaction.id }
          }
        )

        retriedCount++

        if (retryError) {
          console.error(`Retry failed for ${transaction.id}:`, retryError)
          failedCount++
        } else if (data?.success === false) {
          console.error(`Transfer still failing for ${transaction.id}:`, data.error)
          failedCount++
        } else {
          console.log(`✅ Transfer succeeded for ${transaction.id}`)
          successCount++
        }

        // Small delay between retries to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (retryError) {
        console.error(`Error retrying transaction ${transaction.id}:`, retryError)
        failedCount++
      }
    }

    // Log results
    const summary = {
      found: failedTransactions.length,
      retried: retriedCount,
      succeeded: successCount,
      still_failing: failedCount
    }

    console.log('Retry summary:', summary)

    // Create audit log
    try {
      await supabase.from('admin_actions').insert({
        action_type: 'retry_failed_transfers',
        description: `Retried ${retriedCount} failed transfers: ${successCount} succeeded, ${failedCount} still failing`,
        metadata: summary
      })
    } catch (err) {
      console.warn('Failed to log retry summary:', err)
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...summary
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in retry-failed-transfers:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
