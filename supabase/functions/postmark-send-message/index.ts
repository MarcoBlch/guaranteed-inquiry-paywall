import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

interface MessageEmailData {
  senderEmail: string;
  senderMessage: string;
  responseDeadline: string; // e.g., "48 hours"
  paymentAmount: number;
  messageId: string;
  recipientEmail: string;
}

function generateMessageEmailTemplate(data: MessageEmailData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Guaranteed Message - FASTPASS</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">FASTPASS</h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Guaranteed Response Message</p>
                        </td>
                    </tr>

                    <!-- Payment Guarantee Banner -->
                    <tr>
                        <td style="background-color: #e8f5e8; padding: 15px; text-align: center; border-left: 4px solid #28a745;">
                            <p style="margin: 0; color: #155724; font-weight: bold;">
                                💰 ${data.paymentAmount.toFixed(2)}€ Secured Payment • ⏰ ${data.responseDeadline} Response Guarantee
                            </p>
                        </td>
                    </tr>

                    <!-- Message Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 20px;">You have received a guaranteed message</h2>

                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #667eea; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-weight: bold; color: #666; font-size: 14px;">From: ${data.senderEmail}</p>
                                <div style="margin: 15px 0; padding: 15px; background-color: #ffffff; border-radius: 4px; border: 1px solid #e9ecef;">
                                    <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${data.senderMessage}</p>
                                </div>
                            </div>

                            <!-- Response Instructions -->
                            <div style="background-color: #fff3cd; padding: 20px; border-radius: 6px; border: 1px solid #ffeaa7; margin: 20px 0;">
                                <h3 style="margin: 0 0 15px 0; color: #856404; font-size: 16px;">⚡ How to respond and claim your payment:</h3>
                                <ol style="margin: 0; padding-left: 20px; color: #856404;">
                                    <li style="margin-bottom: 8px;"><strong>Reply directly to this email</strong> with your response</li>
                                    <li style="margin-bottom: 8px;"><strong>Response deadline:</strong> Within ${data.responseDeadline}</li>
                                    <li style="margin-bottom: 8px;"><strong>Payment:</strong> Automatically released upon response</li>
                                </ol>
                            </div>

                            <!-- Guarantee Information -->
                            <div style="margin: 30px 0; text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 6px;">
                                <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">✅ Payment Guarantee</h3>
                                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.5;">
                                    <strong>If you respond within ${data.responseDeadline}:</strong> Payment is automatically released to you<br>
                                    <strong>If you don't respond in time:</strong> Payment is automatically refunded to sender
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                            <p style="margin: 0; color: #666; font-size: 12px;">
                                This message was sent via <strong>FASTPASS</strong> - Guaranteed Response Platform<br>
                                Simply reply to this email to respond and claim your payment.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();
}

function generateMessageEmailPlainText(data: MessageEmailData): string {
  return `
FASTPASS - Guaranteed Response Message

💰 ${data.paymentAmount.toFixed(2)}€ Secured Payment • ⏰ ${data.responseDeadline} Response Guarantee

You have received a guaranteed message from: ${data.senderEmail}

MESSAGE:
${data.senderMessage}

HOW TO RESPOND AND CLAIM YOUR PAYMENT:
1. Reply directly to this email with your response
2. Response deadline: Within ${data.responseDeadline}
3. Payment: Automatically released upon response

PAYMENT GUARANTEE:
✅ If you respond within ${data.responseDeadline}: Payment is automatically released to you
❌ If you don't respond in time: Payment is automatically refunded to sender

This message was sent via FASTPASS - Guaranteed Response Platform
Simply reply to this email to respond and claim your payment.
  `.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Sending message email via Postmark');

    const {
      senderEmail,
      senderMessage,
      responseDeadline,
      paymentAmount,
      messageId,
      recipientEmail
    }: MessageEmailData = await req.json();

    // Validate required fields
    if (!senderEmail || !senderMessage || !responseDeadline || !paymentAmount || !messageId || !recipientEmail) {
      throw new Error('Missing required fields');
    }

    const postmarkServerToken = Deno.env.get('POSTMARK_SERVER_TOKEN');
    if (!postmarkServerToken) {
      throw new Error('Postmark server token not configured');
    }

    const emailData = {
      senderEmail,
      senderMessage,
      responseDeadline,
      paymentAmount,
      messageId,
      recipientEmail
    };

    const htmlContent = generateMessageEmailTemplate(emailData);
    const textContent = generateMessageEmailPlainText(emailData);

    // Send email via Postmark API
    const emailResponse = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': postmarkServerToken,
      },
      body: JSON.stringify({
        From: 'FASTPASS <noreply@fastpass.email>',
        To: recipientEmail,
        ReplyTo: '3e25f9d6075c2e558e480850eee96513@inbound.postmarkapp.com', // Route replies through Postmark inbound
        Subject: `💰 Guaranteed Message (${paymentAmount.toFixed(2)}€) - Response within ${responseDeadline}`,
        HtmlBody: htmlContent,
        TextBody: textContent,
        MessageStream: 'outbound',
        TrackOpens: true,
        TrackLinks: 'HtmlAndText',
        Headers: [
          {
            Name: 'X-Fastpass-Message-Id',
            Value: messageId
          },
          {
            Name: 'X-Fastpass-Payment-Amount',
            Value: paymentAmount.toString()
          },
          {
            Name: 'X-Fastpass-Deadline',
            Value: responseDeadline
          }
        ],
        Metadata: {
          messageId: messageId,
          paymentAmount: paymentAmount.toString(),
          deadline: responseDeadline,
          senderEmail: senderEmail
        }
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Postmark API error: ${error}`);
    }

    const result = await emailResponse.json();
    console.log('Email sent successfully via Postmark:', result);

    // Log to database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabase.from('email_logs').insert({
      message_id: messageId,
      recipient_email: recipientEmail,
      sender_email: 'FASTPASS <noreply@fastpass.email>',
      email_provider_id: result.MessageID,
      email_type: 'new_message_notification',
      email_service_provider: 'postmark',
      sent_at: new Date().toISOString(),
      metadata: {
        to: result.To,
        submitted_at: result.SubmittedAt,
        postmark_message_id: result.MessageID,
        error_code: result.ErrorCode || 0
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        emailId: result.MessageID,
        message: 'Email sent successfully via Postmark'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error sending message email via Postmark:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send email'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
})
