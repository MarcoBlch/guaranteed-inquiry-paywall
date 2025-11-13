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
    const { escrowTransactionId } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. ATOMIC LOCK: Claim transaction before any Stripe operations
    // This prevents race conditions where multiple processes try to distribute the same transaction
    const { data: lockedTransaction, error: lockError } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', escrowTransactionId)
      .eq('status', 'held')  // Only succeeds if status is still 'held'
      .select(`
        *,
        profiles!escrow_transactions_recipient_user_id_fkey(
          stripe_account_id,
          stripe_onboarding_completed
        )
      `)
      .single()

    if (lockError || !lockedTransaction) {
      throw new Error(`Transaction already processing or not in held status: ${lockError?.message || 'Not found'}`)
    }

    const transaction = lockedTransaction
    console.log(`Transaction ${escrowTransactionId} locked for processing`)

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const totalAmountCents = Math.round(transaction.amount * 100)

    // 2. Calculer distribution 75/25
    const userAmountCents = Math.round(totalAmountCents * 0.75)    // 75%
    const platformFeeCents = Math.round(totalAmountCents * 0.25)   // 25%

    console.log(`Distributing ${totalAmountCents} cents:`, {
      user: userAmountCents,        // 75%
      platform: platformFeeCents    // 25% (reste automatiquement)
    })

    // 3. Verify payment was captured (should already be 'succeeded' from immediate capture)
    const paymentIntentResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${transaction.stripe_payment_intent_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    })

    if (!paymentIntentResponse.ok) {
      const error = await paymentIntentResponse.text()
      console.error(`Failed to retrieve payment intent for transaction ${escrowTransactionId}:`, error)

      // Rollback to 'held' status so it can be retried
      await supabase
        .from('escrow_transactions')
        .update({
          status: 'held',
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowTransactionId)

      throw new Error(`Failed to retrieve payment intent: ${error}`)
    }

    const capturedPayment = await paymentIntentResponse.json()

    // Verify payment was successful (immediate capture should have already succeeded)
    if (capturedPayment.status !== 'succeeded') {
      console.error(`Payment not yet completed for transaction ${escrowTransactionId}: ${capturedPayment.status}`)

      // Rollback to 'held' status
      await supabase
        .from('escrow_transactions')
        .update({
          status: 'held',
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowTransactionId)

      throw new Error(`Payment not completed: ${capturedPayment.status}`)
    }

    console.log('Payment verified as succeeded:', capturedPayment.id)

    // 4. Transfer vers utilisateur SI Stripe Connect configuré
    let userTransfer = null
    if (transaction.profiles.stripe_account_id && transaction.profiles.stripe_onboarding_completed) {
      const userTransferResponse = await fetch('https://api.stripe.com/v1/transfers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': `transfer-${escrowTransactionId}`,
        },
        body: new URLSearchParams({
          amount: userAmountCents.toString(),
          currency: 'eur',
          destination: transaction.profiles.stripe_account_id,
          description: `FastPass response payment - ${transaction.message_id}`,
          'metadata[transaction_id]': escrowTransactionId,
          'metadata[type]': 'user_payout'
        })
      })

      if (userTransferResponse.ok) {
        userTransfer = await userTransferResponse.json()
        console.log('User transfer created:', userTransfer.id)

        // 5a. Mettre à jour statut = released
        await supabase
          .from('escrow_transactions')
          .update({
            status: 'released',
            updated_at: new Date().toISOString()
          })
          .eq('id', escrowTransactionId)
      } else {
        const error = await userTransferResponse.text()
        console.error('User transfer failed:', error)

        // Mark as failed so we can retry later
        // Money is captured (platform has it), but transfer to user failed
        await supabase
          .from('escrow_transactions')
          .update({
            status: 'transfer_failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', escrowTransactionId)

        // Don't throw - return error response so caller knows
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Transfer failed, marked for retry',
            transaction_id: escrowTransactionId,
            captured_amount: capturedPayment.amount,
            platform_fee: platformFeeCents
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        )
      }
    } else {
      // 5b. Utilisateur n'a pas configuré Stripe - fonds en attente
      console.log('User has not completed Stripe setup - funds held until setup complete')
      
      await supabase
        .from('escrow_transactions')
        .update({ 
          status: 'pending_user_setup',
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowTransactionId)
        
      return new Response(
        JSON.stringify({
          success: true,
          captured_amount: capturedPayment.amount,
          status: 'pending_user_setup',
          message: 'Funds held until user completes Stripe setup',
          platform_fee: platformFeeCents
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. PAS DE TRANSFER CHARITY - les 25% restent automatiquement

    return new Response(
      JSON.stringify({
        success: true,
        captured_amount: capturedPayment.amount,
        user_transfer_id: userTransfer?.id,
        platform_fee: platformFeeCents,
        status: 'released'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error distributing funds:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})