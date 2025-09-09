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

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    let refundedCount = 0
    let errorCount = 0
    let skippedCount = 0

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
            if (graceMinutes <= 5) { // 5-minute grace period
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

        // Cancel payment intent = automatic refund
        const cancelResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${transaction.stripe_payment_intent_id}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
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