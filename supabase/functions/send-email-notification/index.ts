
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailData {
  recipientUserId: string;
  senderEmail: string;
  content: string;
  responseDeadlineHours: number;
  amount: number;
  messageId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const emailData: EmailData = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Récupérer l'email du destinataire
    const { data: userProfile, error: profileError } = await supabase.auth.admin.getUserById(emailData.recipientUserId);

    if (profileError || !userProfile?.user?.email) {
      throw new Error('Recipient email not found')
    }

    const recipientEmail = userProfile.user.email
    const baseUrl = req.headers.get('origin') || 'https://votre-domaine.com'
    const responseUrl = `${baseUrl}/respond/${emailData.messageId}`
    const earnings = emailData.amount * 0.75

    // Calculer la date limite
    const deadline = new Date(Date.now() + emailData.responseDeadlineHours * 60 * 60 * 1000)

    // 2. Template d'email HTML professionnel
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FastPass - New Paid Message</title>
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
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: white; 
            padding: 30px 20px; 
            text-align: center;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
        }
        .amount { 
            background: rgba(255, 255, 255, 0.2);
            color: white; 
            padding: 12px 24px; 
            border-radius: 25px; 
            display: inline-block; 
            font-weight: bold;
            font-size: 20px;
            margin-top: 10px;
        }
        .content { 
            padding: 30px;
        }
        .sender-info {
            background: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            border-left: 4px solid #4F46E5;
        }
        .message-box { 
            background: #ffffff;
            padding: 25px; 
            border-radius: 12px; 
            border: 2px solid #e2e8f0;
            margin: 25px 0;
            position: relative;
        }
        .message-box::before {
            content: '💬';
            position: absolute;
            top: -10px;
            left: 20px;
            background: white;
            padding: 0 10px;
            font-size: 20px;
        }
        .deadline-box { 
            background: linear-gradient(135deg, #F59E0B 0%, #EAB308 100%);
            color: white; 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center;
            margin: 25px 0;
        }
        .cta-button { 
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            color: white; 
            padding: 18px 36px; 
            text-decoration: none; 
            border-radius: 8px; 
            display: inline-block; 
            font-weight: bold;
            font-size: 18px;
            margin: 25px 0;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .info-box { 
            background: #EFF6FF; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 25px 0;
            border-left: 4px solid #3B82F6;
        }
        .info-box h4 {
            margin: 0 0 15px 0;
            color: #1E40AF;
        }
        .info-box ul {
            margin: 0;
            padding-left: 20px;
        }
        .info-box li {
            margin-bottom: 8px;
            color: #1E40AF;
        }
        .footer { 
            text-align: center; 
            padding: 30px;
            background: #f8fafc;
            color: #64748b;
            font-size: 14px;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            text-align: center;
        }
        .stat {
            flex: 1;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #4F46E5;
        }
        .stat-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
        }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .content { padding: 20px; }
            .header { padding: 20px 15px; }
            .stats { flex-direction: column; gap: 15px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💰 New Paid Message</h1>
            <div>Service FastPass</div>
            <div class="amount">€${emailData.amount.toFixed(2)} EUR</div>
        </div>
        
        <div class="content">
            <div class="sender-info">
                <h3 style="margin: 0 0 10px 0; color: #4F46E5;">📧 Sender</h3>
                <div style="font-size: 18px; font-weight: 600;">${emailData.senderEmail}</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 5px;">
                    Sent on ${new Date().toLocaleString('en-US')}
                </div>
            </div>
            
            <div class="message-box">
                <h3 style="margin: 0 0 15px 0; color: #1f2937;">Received message:</h3>
                <div style="font-size: 16px; line-height: 1.7; color: #374151;">
                    ${emailData.content.replace(/\n/g, '<br>')}
                </div>
            </div>
            
            <div class="stats">
                <div class="stat">
                    <div class="stat-value">€${earnings.toFixed(2)}</div>
                    <div class="stat-label">Your earnings (75%)</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${emailData.responseDeadlineHours}h</div>
                    <div class="stat-label">Response deadline</div>
                </div>
                <div class="stat">
                    <div class="stat-value">€${(emailData.amount * 0.25).toFixed(2)}</div>
                    <div class="stat-label">Commission FastPass</div>
                </div>
            </div>
            
            <div class="deadline-box">
                <h3 style="margin: 0 0 10px 0;">⏰ Response deadline</h3>
                <div style="font-size: 18px; font-weight: bold;">
                    Respond before ${deadline.toLocaleDateString('en-US')} at ${deadline.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style="font-size: 14px; margin-top: 8px; opacity: 0.9;">
                    Within ${emailData.responseDeadlineHours} hours maximum
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="${responseUrl}" class="cta-button">
                    🚀 RESPOND NOW
                </a>
                <div style="margin-top: 10px; font-size: 14px; color: #64748b;">
                    Click to respond and receive €${earnings.toFixed(2)}
                </div>
            </div>
            
            <div class="info-box">
                <h4>💡 How it works</h4>
                <ul>
                    <li><strong>Respond within deadline</strong> → You receive €${earnings.toFixed(2)} (75% of amount)</li>
                    <li><strong>No timely response</strong> → Automatic refund to sender</li>
                    <li><strong>Guaranteed payment</strong> → Secured by Stripe, immediate transfer after response</li>
                    <li><strong>Email response</strong> → Sender will receive your response directly</li>
                </ul>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h4 style="margin: 0 0 10px 0; color: #92400e;">⚠️ Important</h4>
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                    If you cannot respond within the deadline, simply ignore this email.
                    Refund will be automatic and no penalty will be applied to you.
                </p>
            </div>
        </div>
        
        <div class="footer">
            <div style="font-weight: 600; margin-bottom: 10px;">FastPass</div>
            <div>Guaranteed Response Message Service</div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                You are receiving this email because someone paid to get a guaranteed response from you.
            </div>
        </div>
    </div>
</body>
</html>`

    // 3. Envoyer l'email via votre service (exemple avec Resend)
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    console.log(`Sending email to ${recipientEmail} for message ${emailData.messageId}`)

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FastPass <noreply@resend.dev>',
        to: [recipientEmail],
        subject: `💰 New paid message (€${emailData.amount.toFixed(2)}) - ${emailData.responseDeadlineHours}h to respond`,
        html: emailHtml,
        reply_to: emailData.senderEmail
      })
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Resend API error:', errorText)
      throw new Error(`Email sending failed: ${errorText}`)
    }

    const emailResult = await emailResponse.json()
    console.log('Email sent successfully:', emailResult.id)

    // 4. Logger l'envoi d'email
    try {
      await supabase.from('email_logs').insert({
        message_id: emailData.messageId,
        recipient_email: recipientEmail,
        sender_email: emailData.senderEmail,
        email_provider_id: emailResult.id,
        email_type: 'new_message_notification',
        sent_at: new Date().toISOString(),
        metadata: {
          amount: emailData.amount,
          deadline_hours: emailData.responseDeadlineHours
        }
      })
    } catch (logError) {
      console.warn('Failed to log email sending:', logError)
      // Ne pas faire échouer le processus pour ça
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_sent: true,
        email_id: emailResult.id,
        recipient: recipientEmail
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending email notification:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to send email notification'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
