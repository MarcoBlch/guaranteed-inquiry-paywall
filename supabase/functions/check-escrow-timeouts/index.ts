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

    // Trouver toutes les transactions expirées (statut 'held' uniquement)
    const { data: expiredTransactions, error } = await supabase
      .from('escrow_transactions')
      .select(`
        *,
        message_responses!inner(has_response)
      `)
      .eq('status', 'held')
      .eq('message_responses.has_response', false)
      .lt('expires_at', new Date().toISOString())

    if (error) throw error

    console.log(`Found ${expiredTransactions.length} expired transactions`)

    // CIRCUIT BREAKER: Safety limits to prevent catastrophic failures
    const MAX_REFUNDS_PER_RUN = 50
    const MAX_REFUND_AMOUNT_PER_RUN = 10000 // €100 total limit

    if (expiredTransactions.length > MAX_REFUNDS_PER_RUN) {
      console.error(`🚨 CIRCUIT BREAKER TRIGGERED`)
      console.error(`${expiredTransactions.length} timeouts detected (max: ${MAX_REFUNDS_PER_RUN})`)
      console.error(`Processing first ${MAX_REFUNDS_PER_RUN}, rest queued for next run`)

      // Create admin alert
      await supabase.from('admin_actions').insert({
        action_type: 'circuit_breaker_triggered',
        description: `${expiredTransactions.length} timeouts detected - circuit breaker activated`,
        metadata: {
          total_timeouts: expiredTransactions.length,
          max_allowed: MAX_REFUNDS_PER_RUN,
          processing_count: MAX_REFUNDS_PER_RUN
        }
      }).catch(err => console.error('Failed to log circuit breaker alert:', err))

      // Process only the first MAX_REFUNDS_PER_RUN transactions
      expiredTransactions = expiredTransactions.slice(0, MAX_REFUNDS_PER_RUN)
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    let refundedCount = 0
    let errorCount = 0
    let skippedCount = 0
    let totalRefundAmount = 0

    for (const transaction of expiredTransactions) {
      try {
        // Double-check expiration (precision improvement)
        const expiresAt = new Date(transaction.expires_at)
        const now = new Date()
        const minutesOverdue = Math.floor((now.getTime() - expiresAt.getTime()) / (1000 * 60))

        if (minutesOverdue < 1) {
          console.log(`Transaction ${transaction.id} not yet expired (${minutesOverdue}min), skipping`)
          skippedCount++
          continue
        }

        // Verify no response was received in the last few minutes
        const { data: recentResponse, error: responseError } = await supabase
          .from('message_responses')
          .select('has_response, response_received_at')
          .eq('message_id', transaction.message_id)
          .single()

        if (responseError) {
          console.error(`Error checking response for transaction ${transaction.id}:`, responseError)
          errorCount++
          continue
        }

        // If response was received after expiry (grace period), honor it
        if (recentResponse?.has_response && recentResponse.response_received_at) {
          const responseTime = new Date(recentResponse.response_received_at)
          if (responseTime > expiresAt) {
            const graceMinutes = Math.floor((responseTime.getTime() - expiresAt.getTime()) / (1000 * 60))
            if (graceMinutes <= 15) { // 15-minute grace period (matches webhook handler)
              console.log(`Response received ${graceMinutes}min after deadline for ${transaction.id}, processing payment`)
              
              // Process the late response
              await supabase.functions.invoke('distribute-escrow-funds', {
                body: { 
                  escrowTransactionId: transaction.id,
                  graceResponse: true,
                  graceMinutes: graceMinutes
                }
              })
              
              skippedCount++
              continue
            }
          }
        }

        console.log(`Processing expired transaction ${transaction.id} (${minutesOverdue}min overdue)`)

        // Circuit breaker: Check total refund amount
        totalRefundAmount += transaction.amount
        if (totalRefundAmount > MAX_REFUND_AMOUNT_PER_RUN) {
          console.error(`🚨 REFUND AMOUNT LIMIT REACHED: €${totalRefundAmount.toFixed(2)} exceeds €${MAX_REFUND_AMOUNT_PER_RUN}`)
          console.error(`Stopping processing. Remaining transactions will be processed in next run.`)

          // Alert admin
          await supabase.from('admin_actions').insert({
            action_type: 'refund_limit_reached',
            description: `Refund amount limit reached: €${totalRefundAmount.toFixed(2)}`,
            metadata: {
              total_refund_amount: totalRefundAmount,
              max_allowed: MAX_REFUND_AMOUNT_PER_RUN,
              processed_count: refundedCount + skippedCount
            }
          }).catch(err => console.error('Failed to log refund limit alert:', err))

          break
        }

        // Cancel payment intent = automatic refund
        const cancelResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${transaction.stripe_payment_intent_id}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Idempotency-Key': `cancel-${transaction.id}`,
          }
        })

        if (cancelResponse.ok) {
          await supabase
            .from('escrow_transactions')
            .update({ 
              status: 'refunded',
              updated_at: new Date().toISOString()
            })
            .eq('id', transaction.id)

          // Send notifications to both parties
          try {
            // 1. Notify sender about refund
            await supabase.functions.invoke('send-refund-notification', {
              body: {
                transactionId: transaction.id,
                messageId: transaction.message_id,
                senderEmail: transaction.sender_email,
                amount: transaction.amount,
                minutesOverdue: minutesOverdue
              }
            })

            // 2. Notify recipient about missed opportunity
            await supabase.functions.invoke('send-timeout-notification', {
              body: {
                transactionId: transaction.id,
                messageId: transaction.message_id,
                recipientUserId: transaction.recipient_user_id,
                amount: transaction.amount,
                minutesOverdue: minutesOverdue
              }
            })
          } catch (notificationError) {
            console.warn('Failed to send timeout notifications:', notificationError)
            // Don't fail the refund process for notification issues
          }

          // Log the refund for audit purposes
          await supabase.from('email_logs').insert({
            message_id: transaction.message_id,
            recipient_email: 'system@fastpass.com',
            sender_email: transaction.sender_email,
            email_provider_id: `refund_${transaction.id}`,
            email_type: 'timeout_refund',
            sent_at: new Date().toISOString(),
            metadata: {
              transaction_id: transaction.id,
              amount_refunded: transaction.amount,
              minutes_overdue: minutesOverdue,
              refund_reason: 'timeout'
            }
          }).catch(logErr => console.warn('Failed to log refund:', logErr))

          console.log(`Refunded expired transaction: ${transaction.id} (${minutesOverdue}min overdue)`)
          refundedCount++
        } else {
          const error = await cancelResponse.text()
          console.error(`Failed to refund transaction ${transaction.id}:`, error)
          errorCount++
        }
      } catch (refundError) {
        console.error(`Error processing expired transaction ${transaction.id}:`, refundError)
        errorCount++
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        total_expired: expiredTransactions.length,
        refunded: refundedCount,
        skipped: skippedCount,
        errors: errorCount,
        processing_summary: {
          refunded_count: refundedCount,
          grace_period_honored: skippedCount,
          processing_errors: errorCount
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error checking escrow timeouts:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})