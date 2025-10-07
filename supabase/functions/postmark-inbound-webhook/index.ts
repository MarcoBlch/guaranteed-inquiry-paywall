import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PostmarkInboundEmail {
  From: string;
  FromFull: {
    Email: string;
    Name: string;
  };
  To: string;
  ToFull: Array<{
    Email: string;
    Name: string;
  }>;
  Cc?: string;
  Subject: string;
  MessageID: string;
  Date: string;
  TextBody: string;
  HtmlBody: string;
  Headers: Array<{
    Name: string;
    Value: string;
  }>;
  Attachments?: Array<any>;
  ReplyTo?: string;
  OriginalRecipient?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // No authentication required - webhook is publicly accessible
    // Postmark doesn't send auth headers, and we identify messages by email threading
    console.log('Processing inbound webhook from Postmark')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const inboundEmail: PostmarkInboundEmail = await req.json()
    console.log('Received Postmark inbound email:', inboundEmail.MessageID, 'from:', inboundEmail.From)

    // STRATEGY 1: Extract message ID from To address (reply+{uuid}@reply.fastpass.email)
    const toAddress = inboundEmail.To || inboundEmail.ToFull?.[0]?.Email
    console.log('Inbound To address:', toAddress)

    let messageId: string | null = null;

    // Try to parse message ID from To address
    if (toAddress) {
      const addressMatch = toAddress.match(/reply\+([a-f0-9-]{36})@reply\.fastpass\.email/i)
      if (addressMatch) {
        messageId = addressMatch[1]
        console.log('✅ Extracted message ID from To address:', messageId)
      }
    }

    // STRATEGY 2: Fallback to In-Reply-To header matching
    if (!messageId) {
      console.log('⚠️ Could not extract from To address, trying In-Reply-To header')

      const headers = inboundEmail.Headers || []
      const inReplyToHeader = headers.find(h => h.Name === 'In-Reply-To')

      if (inReplyToHeader?.Value) {
        const cleanMessageId = inReplyToHeader.Value.replace(/[<>]/g, '')
        console.log('Checking In-Reply-To header:', cleanMessageId)

        const { data: emailLog, error: logError } = await supabase
          .from('email_logs')
          .select(`
            message_id,
            messages!inner(
              id,
              sender_email,
              user_id,
              escrow_transactions!inner(
                id,
                status,
                expires_at
              )
            )
          `)
          .eq('email_provider_id', cleanMessageId)
          .eq('email_type', 'new_message_notification')
          .eq('email_service_provider', 'postmark')
          .single()

        if (emailLog && !logError) {
          messageId = emailLog.message_id
          console.log('✅ Found message via In-Reply-To header:', messageId)
        }
      }
    }

    // STRATEGY 3: Last resort - search by sender email
    if (!messageId) {
      console.log('⚠️ Trying last resort: sender email lookup')

      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select(`
          id,
          sender_email,
          escrow_transactions!inner(
            id,
            status,
            expires_at
          )
        `)
        .eq('sender_email', inboundEmail.From)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (message && !messageError) {
        messageId = message.id
        console.log('✅ Found message via sender email:', messageId)
      }
    }

    // If still no message ID found, return early
    if (!messageId) {
      console.log('❌ No matching message found for inbound email')
      return new Response(JSON.stringify({
        received: true,
        processed: false,
        reason: 'No matching message found',
        debugInfo: {
          toAddress,
          fromAddress: inboundEmail.From,
          hasInReplyTo: !!inboundEmail.Headers?.find(h => h.Name === 'In-Reply-To')
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    console.log('🎯 Processing response for message:', messageId)

    // Get message details and check if transaction is still active
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_email,
        response_deadline_hours,
        created_at,
        escrow_transactions!inner(
          id,
          status,
          expires_at
        ),
        message_responses(
          id,
          has_response
        )
      `)
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      throw new Error('Message not found')
    }

    // Check if already responded
    if (message.message_responses?.[0]?.has_response) {
      console.log('Message already has a response:', messageId)
      return new Response(JSON.stringify({
        received: true,
        processed: false,
        reason: 'Message already responded'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const transaction = message.escrow_transactions
    const deadline = new Date(transaction.expires_at)
    const responseTime = new Date(inboundEmail.Date)
    const gracePeriod = 15 * 60 * 1000 // 15 minutes in milliseconds

    const withinDeadline = responseTime <= deadline
    const withinGracePeriod = responseTime <= new Date(deadline.getTime() + gracePeriod)

    console.log('Response timing:', {
      deadline: deadline.toISOString(),
      responseTime: responseTime.toISOString(),
      withinDeadline,
      withinGracePeriod,
      gracePeriodUsed: !withinDeadline && withinGracePeriod
    })

    // Only process if within deadline or grace period AND transaction is still held
    if (withinGracePeriod && transaction.status === 'held') {

      // Store response tracking data
      const { error: trackingError } = await supabase
        .from('email_response_tracking')
        .insert({
          message_id: messageId,
          original_email_id: inReplyToHeader?.Value?.replace(/[<>]/g, '') || 'unknown',
          inbound_email_id: inboundEmail.MessageID,
          response_email_subject: inboundEmail.Subject,
          response_email_from: inboundEmail.From,
          response_received_at: responseTime.toISOString(),
          response_detected_method: 'webhook',
          within_deadline: withinDeadline,
          grace_period_used: !withinDeadline && withinGracePeriod,
          email_headers: inboundEmail.Headers,
          response_content_preview: inboundEmail.TextBody?.substring(0, 500) || '',
          metadata: {
            subject: inboundEmail.Subject,
            html_body_length: inboundEmail.HtmlBody?.length || 0,
            text_body_length: inboundEmail.TextBody?.length || 0,
            has_attachments: (inboundEmail.Attachments?.length || 0) > 0
          }
        })

      if (trackingError) {
        console.error('Failed to insert response tracking:', trackingError)
      }

      // Mark response as received and trigger fund distribution
      const { error: markError } = await supabase.functions.invoke('mark-response-received', {
        body: {
          messageId: messageId,
          responseReceived: true,
          detectionMethod: 'webhook',
          webhookData: {
            email_id: inboundEmail.MessageID,
            from: inboundEmail.From,
            subject: inboundEmail.Subject,
            detected_at: new Date().toISOString(),
            grace_period_used: !withinDeadline && withinGracePeriod
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

      console.log(`Successfully processed response for message ${messageId}`)

      // Forward response to original sender
      const postmarkServerToken = Deno.env.get('POSTMARK_SERVER_TOKEN')
      if (postmarkServerToken && message.sender_email) {
        try {
          await fetch('https://api.postmarkapp.com/email', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'X-Postmark-Server-Token': postmarkServerToken,
            },
            body: JSON.stringify({
              From: 'FASTPASS <noreply@fastpass.email>',
              To: message.sender_email,
              Subject: `Re: ${inboundEmail.Subject}`,
              TextBody: inboundEmail.TextBody,
              HtmlBody: inboundEmail.HtmlBody || `<p>${inboundEmail.TextBody}</p>`,
              MessageStream: 'outbound',
            })
          })
          console.log(`Forwarded response to sender: ${message.sender_email}`)
        } catch (error) {
          console.error('Failed to forward response to sender:', error)
        }
      }

      // Log inbound email
      await supabase.from('email_logs').insert({
        message_id: messageId,
        recipient_email: inboundEmail.ToFull[0]?.Email || inboundEmail.To,
        sender_email: inboundEmail.From,
        email_provider_id: inboundEmail.MessageID,
        email_type: 'inbound_response',
        email_service_provider: 'postmark',
        sent_at: responseTime.toISOString(),
        response_detected_at: new Date().toISOString(),
        metadata: {
          subject: inboundEmail.Subject,
          within_deadline: withinDeadline,
          grace_period_used: !withinDeadline && withinGracePeriod,
          in_reply_to: inReplyToHeader?.Value
        }
      })

      return new Response(JSON.stringify({
        received: true,
        processed: true,
        messageId: messageId,
        withinDeadline: withinDeadline,
        gracePeriodUsed: !withinDeadline && withinGracePeriod
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else {
      const reason = transaction.status !== 'held'
        ? 'Transaction no longer active'
        : 'Response outside grace period'

      console.log(`Not processing response: ${reason}`, {
        status: transaction.status,
        withinGracePeriod
      })

      return new Response(JSON.stringify({
        received: true,
        processed: false,
        reason: reason
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
