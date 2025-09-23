import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TimeoutNotificationData {
  transactionId: string;
  messageId: string;
  recipientUserId: string;
  amount: number;
  minutesOverdue: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const data: TimeoutNotificationData = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get recipient email
    const { data: recipientProfile, error: profileError } = await supabase.auth.admin.getUserById(data.recipientUserId)
    
    if (profileError || !recipientProfile?.user?.email) {
      throw new Error('Recipient email not found')
    }

    const recipientEmail = recipientProfile.user.email

    // Get message details
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        content,
        sender_email,
        response_deadline_hours,
        created_at
      `)
      .eq('id', data.messageId)
      .single()

    if (messageError || !message) {
      throw new Error('Message not found')
    }

    const lostEarnings = data.amount * 0.75
    const hoursRequested = message.response_deadline_hours
    const timeoutHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>FastPass - Opportunity Missed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px; }
        .missed-earnings { background: #FEF2F2; border: 2px solid #EF4444; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .info-box { background: #EFF6FF; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6; }
        .footer { text-align: center; padding: 30px; background: #f8fafc; color: #64748b; font-size: 14px; }
        .amount { font-size: 28px; font-weight: bold; color: #DC2626; }
        .improvement-box { background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Opportunity Missed</h1>
            <div>A paid message deadline has expired</div>
        </div>
        
        <div class="content">
            <div class="missed-earnings">
                <h2 style="margin: 0 0 15px 0; color: #DC2626;">💸 Earnings Lost</h2>
                <div class="amount">€${lostEarnings.toFixed(2)}</div>
                <div style="margin-top: 10px; color: #991B1B;">
                    This amount has been refunded to the sender
                </div>
            </div>
            
            <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                <h3 style="margin: 0 0 15px 0; color: #92400E;">⚠️ What happened?</h3>
                <p style="margin: 0; color: #92400E;">
                    A message from <strong>${message.sender_email}</strong> required a response within ${hoursRequested} hours, 
                    but no response was provided. The deadline passed ${Math.floor(data.minutesOverdue / 60)}h ${data.minutesOverdue % 60}m ago.
                </p>
            </div>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0;">📧 The Message You Missed</h3>
                <div style="font-size: 12px; color: #6B7280; margin-bottom: 10px;">
                    From: ${message.sender_email} • Sent: ${new Date(message.created_at).toLocaleString('en-US')}
                </div>
                <div style="font-style: italic; color: #374151; background: white; padding: 15px; border-radius: 6px; max-height: 150px; overflow: hidden;">
                  ${message.content.substring(0, 400)}${message.content.length > 400 ? '...' : ''}
                </div>
            </div>
            
            <div class="improvement-box">
                <h4 style="margin: 0 0 15px 0; color: #065F46;">💡 How to avoid missing future opportunities</h4>
                <ul style="margin: 0; padding-left: 20px; color: #065F46;">
                    <li><strong>Enable email notifications</strong> - Check your email settings</li>
                    <li><strong>Set up mobile alerts</strong> - Get notified instantly</li>
                    <li><strong>Check FastPass regularly</strong> - Visit your dashboard daily</li>
                    <li><strong>Use reminder settings</strong> - We send reminders at 50% deadline</li>
                </ul>
            </div>
            
            <div class="info-box">
                <h4 style="margin: 0 0 15px 0; color: #1E40AF;">📊 Your FastPass Stats</h4>
                <p style="margin: 0; color: #1E40AF;">
                    This missed opportunity affects your response rate. Maintaining a high response rate 
                    helps you attract more quality messages and earn more through FastPass.
                </p>
            </div>
            
            <div style="background: #EFF6FF; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <h4 style="margin: 0 0 15px 0; color: #1E40AF;">📱 Optimize Your Settings</h4>
                <p style="margin: 0 0 15px 0; color: #1E40AF;">
                    Update your notification preferences to never miss another paid opportunity.
                </p>
                <a href="https://fastpass.com/dashboard" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                    Go to Dashboard
                </a>
            </div>

            <div style="background: #F9FAFB; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 12px; color: #6B7280;">
                <strong>Transaction Details:</strong><br>
                • Transaction ID: ${data.transactionId}<br>
                • Message ID: ${data.messageId}<br>
                • Original Deadline: ${hoursRequested} hours<br>
                • Overdue by: ${Math.floor(data.minutesOverdue / 60)}h ${data.minutesOverdue % 60}m<br>
                • Refund Date: ${new Date().toLocaleString('en-US')}<br>
                • Lost Earnings: €${lostEarnings.toFixed(2)}
            </div>
        </div>
        
        <div class="footer">
            <div style="font-weight: 600; margin-bottom: 10px;">FastPass</div>
            <div>Don't worry - there are more opportunities ahead!</div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                Set up better notifications to catch the next paid message.
            </div>
        </div>
    </div>
</body>
</html>`

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FastPass <noreply@resend.dev>',
        to: [recipientEmail],
        subject: `💸 Opportunity Missed - €${lostEarnings.toFixed(2)} lost (Deadline expired)`,
        html: timeoutHtml
      })
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Resend API error:', errorText)
      throw new Error(`Email sending failed: ${errorText}`)
    }

    const emailResult = await emailResponse.json()
    console.log('Timeout notification sent:', emailResult.id)

    // Log the notification
    await supabase.from('email_logs').insert({
      message_id: data.messageId,
      recipient_email: recipientEmail,
      sender_email: 'system@fastpass.com',
      email_provider_id: emailResult.id,
      email_type: 'timeout_notification',
      sent_at: new Date().toISOString(),
      metadata: {
        transaction_id: data.transactionId,
        lost_earnings: lostEarnings,
        minutes_overdue: data.minutesOverdue
      }
    })

    return new Response(JSON.stringify({ 
      success: true,
      email_sent: true,
      email_id: emailResult.id,
      recipient: recipientEmail
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error sending timeout notification:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})