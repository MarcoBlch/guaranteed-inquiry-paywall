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
    console.log('=== POSTMARK WEBHOOK RECEIVED ===')

    // 🔒 SECURITY: Verify Postmark webhook authentication
    // Postmark uses Basic Auth for inbound webhooks
    const authHeader = req.headers.get('authorization')
    const expectedSecret = Deno.env.get('POSTMARK_INBOUND_WEBHOOK_SECRET')

    if (!expectedSecret) {
      console.error('❌ POSTMARK_INBOUND_WEBHOOK_SECRET not configured!')
      return new Response(JSON.stringify({
        error: 'Webhook authentication not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify Basic Auth header
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      console.error('❌ Missing or invalid Authorization header')
      return new Response(JSON.stringify({
        error: 'Unauthorized - Invalid authentication'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extract and verify credentials
    const base64Credentials = authHeader.slice(6) // Remove "Basic "
    const credentials = atob(base64Credentials)
    const [username, password] = credentials.split(':')

    // Postmark uses 'username:password' format for Basic Auth
    // The expectedSecret should be in format "username:password"
    const expectedCredentials = expectedSecret

    if (credentials !== expectedCredentials) {
      console.error('❌ Invalid webhook credentials')
      return new Response(JSON.stringify({
        error: 'Unauthorized - Invalid credentials'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Webhook authentication verified')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const inboundEmail: PostmarkInboundEmail = await req.json()
    console.log('📧 Inbound email:', {
      messageID: inboundEmail.MessageID,
      from: inboundEmail.From,
      to: inboundEmail.To,
      subject: inboundEmail.Subject
    })

    // Extract message ID from To address (reply+{uuid}@reply.fastpass.email)
    const toAddress = inboundEmail.To || inboundEmail.ToFull?.[0]?.Email
    console.log('To address:', toAddress)

    let messageId: string | null = null;

    // Try to parse message ID from To address
    if (toAddress) {
      const addressMatch = toAddress.match(/reply\+([a-f0-9-]{36})@reply\.fastpass\.email/i)
      if (addressMatch) {
        messageId = addressMatch[1]
        console.log('✅ Extracted message ID from To address:', messageId)
      }
    }

    // If still no message ID found, return early
    if (!messageId) {
      console.log('❌ No matching message found for inbound email')
      return new Response(JSON.stringify({
        received: true,
        processed: false,
        reason: 'No matching message ID found in To address'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    console.log('🔍 Querying for transaction with message ID:', messageId)

    // Query escrow_transactions with the CORRECT schema
    const { data: transaction, error: fetchError } = await supabase
      .from('escrow_transactions')
      .select(`
        id,
        status,
        amount,
        expires_at,
        recipient_user_id,
        sender_email,
        message_id
      `)
      .eq('message_id', messageId)
      .single()

    console.log('Database query result:', {
      hasError: !!fetchError,
      errorMessage: fetchError?.message,
      hasTransaction: !!transaction,
      transactionData: transaction
    })

    if (fetchError || !transaction) {
      console.error('❌ Transaction not found:', fetchError)
      return new Response(JSON.stringify({
        received: true,
        processed: false,
        reason: 'Transaction not found in database',
        error: fetchError?.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Check transaction status
    if (transaction.status !== 'held') {
      console.log(`Transaction status is "${transaction.status}", not "held"`)
      return new Response(JSON.stringify({
        received: true,
        processed: false,
        reason: `Transaction status is "${transaction.status}", not "held"`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Parse dates safely
    const now = new Date()
    const gracePeriod = 15 * 60 * 1000 // 15 minutes in milliseconds

    let deadline: Date
    let responseTime: Date = now

    try {
      deadline = new Date(transaction.expires_at)

      if (isNaN(deadline.getTime())) {
        console.error('❌ Invalid deadline date:', transaction.expires_at)
        deadline = new Date(Date.now() + gracePeriod)
      }
    } catch (error) {
      console.error('❌ Error parsing deadline:', error)
      deadline = new Date(Date.now() + gracePeriod)
    }

    // Calculate grace period deadline
    let gracePeriodDeadline: Date
    try {
      gracePeriodDeadline = new Date(deadline.getTime() + gracePeriod)
      if (isNaN(gracePeriodDeadline.getTime())) {
        gracePeriodDeadline = new Date(Date.now() + gracePeriod)
      }
    } catch (error) {
      gracePeriodDeadline = new Date(Date.now() + gracePeriod)
    }

    const withinDeadline = responseTime <= deadline
    const withinGracePeriod = responseTime <= gracePeriodDeadline

    console.log('⏰ Timing check:', {
      now: responseTime.toISOString(),
      deadline: isNaN(deadline.getTime()) ? 'Invalid' : deadline.toISOString(),
      gracePeriodDeadline: isNaN(gracePeriodDeadline.getTime()) ? 'Invalid' : gracePeriodDeadline.toISOString(),
      withinDeadline,
      withinGracePeriod
    })

    // Check if within grace period
    if (!withinGracePeriod) {
      console.log('❌ Response received after grace period')
      return new Response(JSON.stringify({
        received: true,
        processed: false,
        reason: 'Response received after deadline (including grace period)'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    console.log('✅ Response is within grace period, processing...')

    // Check for duplicate webhook (idempotency protection)
    const { data: existingTracking } = await supabase
      .from('email_response_tracking')
      .select('id')
      .eq('inbound_email_id', inboundEmail.MessageID)
      .maybeSingle()

    if (existingTracking) {
      console.log('⚠️ Webhook already processed (duplicate detected)')
      return new Response(JSON.stringify({
        received: true,
        processed: false,
        reason: 'Duplicate webhook - already processed',
        messageId: messageId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Store response tracking data
    const { error: trackingError } = await supabase
      .from('email_response_tracking')
      .insert({
        message_id: messageId,
        original_email_id: messageId,
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
      console.error('⚠️ Failed to insert response tracking:', trackingError)
    } else {
      console.log('✅ Response tracking saved')
    }

    // Mark response as received and trigger fund distribution
    console.log('💰 Triggering fund distribution...')
    const { error: markError } = await supabase.functions.invoke('mark-response-received', {
      body: {
        messageId: messageId,
        responseReceived: true,
        detectionMethod: 'webhook',
        webhookData: {
          email_id: inboundEmail.MessageID,
          from: inboundEmail.From,
          subject: inboundEmail.Subject,
          detected_at: responseTime.toISOString(),
          grace_period_used: !withinDeadline && withinGracePeriod
        }
      }
    })

    if (markError) {
      console.error('❌ Failed to mark response:', markError)
      return new Response(JSON.stringify({
        received: true,
        processed: false,
        error: 'Failed to process response',
        details: markError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Successfully processed response for message:', messageId)

    // Generate HMAC rating link (non-blocking — failure never prevents forwarding)
    let ratingSection = ''
    let ratingTextSection = ''
    try {
      const ratingSecret = Deno.env.get('RATING_SECRET')
      if (ratingSecret) {
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(ratingSecret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        )
        const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(transaction.id))
        const token = btoa(String.fromCharCode(...new Uint8Array(signature)))

        const rateUrl = `https://fastpass.email/rate?token=${encodeURIComponent(token)}&tx=${transaction.id}`

        ratingSection = `
          <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="color:#64748b;font-size:14px;margin-bottom:12px;">How was this response?</p>
            <a href="${rateUrl}" style="display:inline-block;padding:10px 24px;background:#22c55e;color:white;text-decoration:none;border-radius:6px;font-weight:600;">Rate this response</a>
          </div>
        `
        ratingTextSection = `\n\n---\nHow was this response? Rate it here: ${rateUrl}`
      }
    } catch (ratingError) {
      console.error('⚠️ Failed to generate rating link (non-blocking):', ratingError)
    }

    // Forward response to original sender
    const postmarkServerToken = Deno.env.get('POSTMARK_SERVER_TOKEN')
    if (postmarkServerToken && transaction.sender_email) {
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
            To: transaction.sender_email,
            Subject: `Re: ${inboundEmail.Subject}`,
            TextBody: (inboundEmail.TextBody || '') + ratingTextSection,
            HtmlBody: (inboundEmail.HtmlBody || `<p>${inboundEmail.TextBody}</p>`) + ratingSection,
            MessageStream: 'outbound',
          })
        })
        console.log(`📤 Forwarded response to sender: ${transaction.sender_email}`)
      } catch (error) {
        console.error('⚠️ Failed to forward response to sender:', error)
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
      response_detected_at: responseTime.toISOString(),
      metadata: {
        subject: inboundEmail.Subject,
        within_deadline: withinDeadline,
        grace_period_used: !withinDeadline && withinGracePeriod
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

  } catch (error: any) {
    console.error('💥 Webhook processing error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    })

    return new Response(JSON.stringify({
      error: error.message,
      received: true,
      processed: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
