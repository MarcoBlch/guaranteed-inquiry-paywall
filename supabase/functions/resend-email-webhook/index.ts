import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, resend-webhook-signature',
}

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    headers?: Record<string, string>;
    text?: string;
    html?: string;
  }
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

    // Verify webhook signature (optional but recommended)
    const signature = req.headers.get('resend-webhook-signature')
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET')
    
    if (webhookSecret && signature) {
      // TODO: Implement signature verification
      console.log('Webhook signature verification (optional):', signature)
    }

    const payload: ResendWebhookPayload = await req.json()
    console.log('Received webhook:', payload.type, payload.data.email_id)

    // Only process email replies/deliveries that could indicate responses
    if (payload.type === 'email.delivered' || payload.type === 'email.replied') {
      const emailId = payload.data.email_id
      
      // 1. Find the original message by email_provider_id
      const { data: emailLog, error: logError } = await supabase
        .from('email_logs')
        .select(`
          message_id,
          email_type,
          messages!inner(
            id,
            sender_email,
            escrow_transactions!inner(
              status,
              expires_at
            )
          )
        `)
        .eq('email_provider_id', emailId)
        .eq('email_type', 'new_message_notification')
        .single()

      if (logError || !emailLog) {
        console.log('No matching email log found for', emailId)
        return new Response(JSON.stringify({ received: true, processed: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // 2. Check if this is a reply to our notification
      if (payload.type === 'email.replied' || 
          (payload.data.from && payload.data.from.includes(emailLog.messages.sender_email))) {
        
        const messageId = emailLog.message_id
        console.log(`Detected email reply for message ${messageId}`)

        // 3. Check if transaction is still active (not expired/processed)
        const transaction = emailLog.messages.escrow_transactions[0]
        if (transaction.status === 'held' && new Date(transaction.expires_at) > new Date()) {
          
          // 4. Mark response as received
          const { error: markError } = await supabase.functions.invoke('mark-response-received', {
            body: { 
              messageId: messageId,
              responseReceived: true,
              detectionMethod: 'email_webhook',
              webhookData: {
                email_id: emailId,
                webhook_type: payload.type,
                from: payload.data.from,
                subject: payload.data.subject,
                detected_at: new Date().toISOString()
              }
            }
          })

          if (markError) {
            console.error('Failed to mark response:', markError)
            return new Response(JSON.stringify({ error: 'Failed to process response' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          console.log(`Successfully marked response for message ${messageId}`)
          
          // 5. Log the detection
          await supabase.from('email_logs').insert({
            message_id: messageId,
            recipient_email: payload.data.from,
            sender_email: 'system@fastpass.com',
            email_provider_id: `webhook_${emailId}`,
            email_type: 'response_detected',
            sent_at: new Date().toISOString(),
            metadata: {
              detection_method: 'webhook',
              original_email_id: emailId,
              webhook_type: payload.type
            }
          })
        } else {
          console.log(`Transaction not active for message ${messageId}: status=${transaction.status}`)
        }
      }
    }

    return new Response(JSON.stringify({ received: true, processed: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})