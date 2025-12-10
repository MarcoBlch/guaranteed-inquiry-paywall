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
      .in('status', ['held', 'transfer_failed'])  // Allow retrying failed transfers
      .select(`
        *,
        profiles!escrow_transactions_recipient_user_id_fkey(
          stripe_account_id,
          stripe_onboarding_completed
        )
      `)
      .single()

    if (lockError || !lockedTransaction) {
      throw new Error(`Transaction already processing or not in held/transfer_failed status: ${lockError?.message || 'Not found'}`)
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

        // 5a. CRITICAL: Update status to 'released' with proper error handling
        // This is the most critical database operation - if this fails after transfer succeeds,
        // we have money transferred but DB not updated (inconsistent state)
        const { data: updatedTransaction, error: updateError } = await supabase
          .from('escrow_transactions')
          .update({
            status: 'released',
            stripe_transfer_id: userTransfer.id,  // Store transfer ID for reconciliation
            updated_at: new Date().toISOString()
          })
          .eq('id', escrowTransactionId)
          .select()
          .single()

        if (updateError) {
          // CRITICAL ERROR: Transfer succeeded but DB update failed
          // Log extensively for manual reconciliation
          console.error('CRITICAL: Stripe transfer succeeded but DB update failed', {
            transaction_id: escrowTransactionId,
            stripe_transfer_id: userTransfer.id,
            transfer_amount: userAmountCents,
            error: updateError.message,
            error_details: updateError,
            timestamp: new Date().toISOString()
          })

          // Try to mark as 'transfer_failed' so retry mechanism can pick it up
          // (even though transfer succeeded - this is for manual intervention)
          const { error: fallbackError } = await supabase
            .from('escrow_transactions')
            .update({
              status: 'transfer_failed',
              stripe_transfer_id: userTransfer.id,  // Store the successful transfer ID
              updated_at: new Date().toISOString()
            })
            .eq('id', escrowTransactionId)

          if (fallbackError) {
            console.error('CRITICAL: Even fallback status update failed', {
              transaction_id: escrowTransactionId,
              stripe_transfer_id: userTransfer.id,
              fallback_error: fallbackError.message
            })
          }

          // Return error response with transfer ID for manual reconciliation
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Transfer succeeded but database update failed - requires manual reconciliation',
              critical: true,
              transaction_id: escrowTransactionId,
              stripe_transfer_id: userTransfer.id,
              transfer_amount: userAmountCents,
              platform_fee: platformFeeCents,
              db_error: updateError.message
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          )
        }

        console.log('Transaction status updated to released:', {
          transaction_id: escrowTransactionId,
          stripe_transfer_id: userTransfer.id,
          status: updatedTransaction.status
        })
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

      const { error: setupError } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'pending_user_setup',
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowTransactionId)

      if (setupError) {
        console.error('Failed to update transaction to pending_user_setup:', {
          transaction_id: escrowTransactionId,
          error: setupError.message
        })

        return new Response(
          JSON.stringify({
            success: false,
            error: 'Database update failed',
            transaction_id: escrowTransactionId,
            db_error: setupError.message
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        )
      }

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
    // This catch block should only catch errors that happen BEFORE the Stripe transfer
    // or unexpected errors. Post-transfer errors are handled inline above.
    console.error('Error distributing funds (caught in outer try-catch):', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      note: 'This error occurred before Stripe transfer or is an unexpected error'
    })

    return new Response(
      JSON.stringify({
        error: error.message,
        phase: 'pre_transfer_or_unexpected',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})