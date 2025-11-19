import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.6.0'

serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature')
    const body = await req.text()

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
      console.error('Missing signature or webhook secret')
      return new Response(JSON.stringify({
        received: false,
        error: 'missing_signature_or_secret'
      }), {
        status: 200,  // Return 200 to prevent Stripe retries
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey!, { apiVersion: '2023-10-16' })

    // Verify webhook signature (SECURE) - FIXED: Use async version
    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      )
      console.log(`✅ Webhook signature verified: ${event.type} (${event.id})`)
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', err instanceof Error ? err.message : 'Unknown error')
      // Return 200 to prevent retry storm - log for investigation
      return new Response(JSON.stringify({
        received: false,
        error: 'signature_verification_failed'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // IDEMPOTENCY CHECK: Prevent duplicate event processing
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('event_id', event.id)
      .single()

    if (existingEvent) {
      console.log(`✅ Event ${event.id} (${event.type}) already processed, skipping`)
      return new Response(JSON.stringify({
        received: true,
        skipped: true,
        reason: 'already_processed'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Record that we're processing this event (idempotency)
    const { error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        event_id: event.id,
        event_type: event.type
      })

    if (insertError) {
      console.error(`Failed to record webhook event ${event.id}:`, insertError.message)
      // Continue processing anyway - we'll catch duplicates on next retry
    } else {
      console.log(`🔄 Processing new webhook event: ${event.type} (${event.id})`)
    }

    switch (event.type) {
      case 'account.updated':
        const account = event.data.object

        // Production-safe logging - only log non-sensitive information
        console.log(`Account updated webhook received for account: ${account.id}`)

        // Only log detailed info in development/test environment
        if (Deno.env.get('ENVIRONMENT') === 'development') {
          console.log('Debug - Account details:', {
            id: account.id,
            details_submitted: account.details_submitted,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            capabilities: account.capabilities
          })
        }

        // More lenient condition - just need details submitted and charges enabled
        if (account.details_submitted && account.charges_enabled) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ stripe_onboarding_completed: true })
            .eq('stripe_account_id', account.id)

          if (!updateError) {
            console.log(`Stripe onboarding completed for account: ${account.id}`)

            // Process pending transfers
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('stripe_account_id', account.id)
              .single()

            if (profile) {
              await supabase.functions.invoke('process-pending-transfers', {
                body: { userId: profile.id }
              })
            }
          } else {
            console.error(`Failed to update onboarding status for account ${account.id}:`, updateError.message)
          }
        } else {
          console.log(`Account ${account.id} not ready - details_submitted: ${account.details_submitted}, charges_enabled: ${account.charges_enabled}`)
        }
        break

      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object.id)
        // Payment capture succeeded - funds are now in platform account
        break

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent
        console.error('Payment failed:', failedPayment.id, failedPayment.last_payment_error?.message)

        // Mark transaction as payment failed
        await supabase
          .from('escrow_transactions')
          .update({
            status: 'payment_failed',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_payment_intent_id', failedPayment.id)

        break

      case 'transfer.created':
        const createdTransfer = event.data.object as Stripe.Transfer
        console.log('Transfer created:', createdTransfer.id, `Amount: ${createdTransfer.amount} to ${createdTransfer.destination}`)
        // Transfer initiated successfully
        break

      case 'transfer.failed':
        const failedTransfer = event.data.object as Stripe.Transfer
        console.error('🚨 Transfer failed:', failedTransfer.id, failedTransfer.failure_message)

        // Find transaction and mark for retry
        const transactionId = failedTransfer.metadata?.transaction_id

        if (transactionId) {
          await supabase
            .from('escrow_transactions')
            .update({
              status: 'transfer_failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', transactionId)

          // Create admin alert
          await supabase
            .from('admin_actions')
            .insert({
              action_type: 'transfer_failed_alert',
              description: `Transfer ${failedTransfer.id} failed: ${failedTransfer.failure_message}`,
              metadata: {
                transfer_id: failedTransfer.id,
                transaction_id: transactionId,
                failure_message: failedTransfer.failure_message,
                amount: failedTransfer.amount
              }
            })

          console.log(`Transaction ${transactionId} marked as transfer_failed`)
        } else {
          console.error('No transaction_id in transfer metadata:', failedTransfer.id)
        }

        break

      case 'transfer.reversed':
        const reversedTransfer = event.data.object as Stripe.Transfer
        console.error('⚠️ Transfer reversed:', reversedTransfer.id)

        // This shouldn't happen often - investigate if it does
        const reversedTxId = reversedTransfer.metadata?.transaction_id

        if (reversedTxId) {
          await supabase
            .from('admin_actions')
            .insert({
              action_type: 'transfer_reversed_alert',
              description: `Transfer ${reversedTransfer.id} was reversed`,
              metadata: {
                transfer_id: reversedTransfer.id,
                transaction_id: reversedTxId,
                amount: reversedTransfer.amount
              }
            })
        }

        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Error', { status: 400 })
  }
})