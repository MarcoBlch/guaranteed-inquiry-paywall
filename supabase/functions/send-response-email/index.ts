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
    const { messageId, responseContent, senderEmail } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Récupérer les détails complets du message
    const { data: message, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles!messages_user_id_fkey(email),
        escrow_transactions(amount, status),
        message_responses(response_sent_at)
      `)
      .eq('id', messageId)
      .single()

    if (error || !message) {
      throw new Error('Message not found')
    }

    const responderEmail = message.profiles?.email || 'unknown@example.com'
    const amount = message.escrow_transactions?.[0]?.amount || 0
    const responderEarnings = amount * 0.75
    const platformCommission = amount * 0.25

    // Template d'email de réponse professionnel
    const responseEmailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FastPass - Response Received</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0;
            background-color: #f8fafc;
        }
        .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            color: white; 
            padding: 30px 20px; 
            text-align: center;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
        }
        .success-badge {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
            font-size: 14px;
            font-weight: 600;
            margin-top: 10px;
        }
        .content { 
            padding: 30px;
        }
        .original-message { 
            background: #f8fafc; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            border-left: 4px solid #64748b;
        }
        .response-message { 
            background: #ecfdf5; 
            padding: 25px; 
            border-radius: 12px; 
            margin: 25px 0; 
            border: 2px solid #10b981;
            position: relative;
        }
        .response-message::before {
            content: '💬';
            position: absolute;
            top: -12px;
            left: 20px;
            background: #ecfdf5;
            padding: 0 10px;
            font-size: 20px;
        }
        .payment-summary {
            background: #eff6ff;
            padding: 25px;
            border-radius: 8px;
            margin: 25px 0;
            border-left: 4px solid #3b82f6;
        }
        .payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
        }
        .payment-row:last-child {
            border-top: 2px solid #3b82f6;
            margin-top: 15px;
            padding-top: 15px;
            font-weight: bold;
            font-size: 18px;
        }
        .responder-info {
            background: #f0f9ff;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        .footer { 
            text-align: center; 
            padding: 30px;
            background: #f8fafc;
            color: #64748b;
            font-size: 14px;
        }
        .rating-section {
            background: #fef7cd;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
            border-left: 4px solid #f59e0b;
        }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .content { padding: 20px; }
            .header { padding: 20px 15px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Response Received!</h1>
            <div>Your FastPass message received a response</div>
            <div class="success-badge">Mission accomplished</div>
        </div>
        
        <div class="content">
            <div class="responder-info">
                <h3 style="margin: 0 0 10px 0; color: #0369a1;">👤 Response from</h3>
                <div style="font-size: 18px; font-weight: 600; color: #0c4a6e;">${responderEmail}</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 5px;">
                    Responded on ${new Date().toLocaleString('en-US')}
                </div>
            </div>
            
            <div class="original-message">
                <h3 style="margin: 0 0 15px 0; color: #475569;">📝 Your original message</h3>
                <div style="font-style: italic; color: #64748b;">
                    "${message.content.length > 200 ? message.content.substring(0, 200) + '...' : message.content}"
                </div>
            </div>
            
            <div class="response-message">
                <h3 style="margin: 0 0 20px 0; color: #065f46;">💬 Response received</h3>
                <div style="font-size: 16px; line-height: 1.7; color: #064e3b;">
                    ${responseContent.replace(/\n/g, '<br>')}
                </div>
            </div>
            
            <div class="payment-summary">
                <h3 style="margin: 0 0 20px 0; color: #1e40af;">💰 Payment summary</h3>
                <div class="payment-row">
                    <span>Amount paid:</span>
                    <span>€${amount.toFixed(2)}</span>
                </div>
                <div class="payment-row">
                    <span>Paid to responder (75%):</span>
                    <span style="color: #10b981;">€${responderEarnings.toFixed(2)}</span>
                </div>
                <div class="payment-row">
                    <span>Commission FastPass (25%):</span>
                    <span style="color: #64748b;">€${platformCommission.toFixed(2)}</span>
                </div>
                <div class="payment-row">
                    <span>Status:</span>
                    <span style="color: #10b981;">✅ Payment completed</span>
                </div>
            </div>

            <div class="rating-section">
                <h4 style="margin: 0 0 15px 0; color: #92400e;">⭐ Rate your experience</h4>
                <p style="margin: 0 0 15px 0; color: #92400e; font-size: 14px;">
                    Your feedback helps us improve FastPass
                </p>
                <div style="margin: 15px 0;">
                    <a href="mailto:feedback@votre-domaine.com?subject=FastPass Feedback - Message ${messageId}&body=My rating: ⭐⭐⭐⭐⭐%0D%0A%0D%0AMy comment:" 
                       style="background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px;">
                        Give feedback
                    </a>
                </div>
            </div>

            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
                <h4 style="margin: 0 0 15px 0; color: #14532d;">✨ How FastPass worked for you</h4>
                <ul style="margin: 10px 0; padding-left: 20px; color: #166534;">
                    <li>Response guarantee honored ✅</li>
                    <li>Payment secured by Stripe ✅</li>
                    <li>Response within agreed timeframe ✅</li>
                    <li>No risk - automatic refund if no response ✅</li>
                </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <h4 style="color: #4f46e5;">🚀 Need another guaranteed response?</h4>
                <p style="color: #64748b; margin: 10px 0;">
                    FastPass lets you get guaranteed responses from anyone
                </p>
                <a href="https://votre-domaine.com" 
                   style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                    Send a new message
                </a>
            </div>
        </div>
        
        <div class="footer">
            <div style="font-weight: 600; margin-bottom: 10px;">FastPass</div>
            <div>Guaranteed Response Message Service</div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                Transaction ID: ${messageId}<br>
                For any questions: support@votre-domaine.com
            </div>
        </div>
    </div>
</body>
</html>`

    // Envoyer l'email de réponse
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    console.log(`Sending response email to ${senderEmail} for message ${messageId}`)

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FastPass <noreply@votre-domaine.com>',
        to: [senderEmail],
        subject: `✅ Response received for your FastPass message (€${amount.toFixed(2)})`,
        html: responseEmailHtml,
        reply_to: responderEmail
      })
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Failed to send response email:', errorText)
      throw new Error(`Email sending failed: ${errorText}`)
    }

    const emailResult = await emailResponse.json()
    console.log('Response email sent successfully:', emailResult.id)

    // Logger l'envoi
    try {
      await supabase.from('email_logs').insert({
        message_id: messageId,
        recipient_email: senderEmail,
        sender_email: responderEmail,
        email_provider_id: emailResult.id,
        email_type: 'response_notification',
        sent_at: new Date().toISOString(),
        metadata: {
          amount: amount,
          responder_earnings: responderEarnings
        }
      })
    } catch (logError) {
      console.warn('Failed to log response email:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        email_id: emailResult.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending response email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})