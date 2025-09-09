import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RefundNotificationData {
  transactionId: string;
  messageId: string;
  senderEmail: string;
  amount: number;
  minutesOverdue: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const data: RefundNotificationData = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get message details for context
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        content,
        response_deadline_hours,
        user_id,
        profiles!inner(id)
      `)
      .eq('id', data.messageId)
      .single()

    if (messageError || !message) {
      throw new Error('Message not found')
    }

    // Get recipient email for context
    const { data: recipientProfile, error: recipientError } = await supabase.auth.admin.getUserById(message.user_id)
    const recipientEmail = recipientProfile?.user?.email || 'Unknown recipient'

    const hoursRequested = message.response_deadline_hours
    const refundHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>FastPass - Refund Processed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px; }
        .refund-box { background: #F0FDF4; border: 2px solid #10B981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .info-box { background: #EFF6FF; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6; }
        .footer { text-align: center; padding: 30px; background: #f8fafc; color: #64748b; font-size: 14px; }
        .amount { font-size: 28px; font-weight: bold; color: #059669; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Refund Processed</h1>
            <div>Your FastPass payment has been refunded</div>
        </div>
        
        <div class="content">
            <div class="refund-box">
                <h2 style="margin: 0 0 15px 0; color: #059669;">💰 Refund Amount</h2>
                <div class="amount">€${data.amount.toFixed(2)}</div>
                <div style="margin-top: 10px; color: #065F46;">
                    Refunded to your original payment method
                </div>
            </div>
            
            <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                <h3 style="margin: 0 0 15px 0; color: #92400E;">⏰ What happened?</h3>
                <p style="margin: 0; color: #92400E;">
                    Unfortunately, <strong>${recipientEmail}</strong> didn't respond within the ${hoursRequested}-hour deadline 
                    you paid for. Your message went unanswered for ${Math.floor(data.minutesOverdue / 60)}h ${data.minutesOverdue % 60}m 
                    past the deadline.
                </p>
            </div>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0;">📧 Your Original Message</h3>
                <div style="font-style: italic; color: #374151; background: white; padding: 15px; border-radius: 6px; max-height: 150px; overflow: hidden;">
                  ${message.content.substring(0, 300)}${message.content.length > 300 ? '...' : ''}
                </div>
            </div>
            
            <div class="info-box">
                <h4 style="margin: 0 0 15px 0; color: #1E40AF;">💡 What happens now?</h4>
                <ul style="margin: 0; padding-left: 20px; color: #1E40AF;">
                    <li><strong>Full refund processed</strong> - You'll see the money back in your account within 3-5 business days</li>
                    <li><strong>No charges applied</strong> - You only pay when you get guaranteed responses</li>
                    <li><strong>Try again anytime</strong> - The recipient may respond better at different times</li>
                    <li><strong>Consider other professionals</strong> - FastPass has many active recipients</li>
                </ul>
            </div>
            
            <div style="background: #EFF6FF; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <h4 style="margin: 0 0 15px 0; color: #1E40AF;">🔄 Want to try again?</h4>
                <p style="margin: 0 0 15px 0; color: #1E40AF;">
                    Maybe try a different time frame or find other professionals in your field.
                </p>
                <a href="https://fastpass.com" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                    Browse FastPass
                </a>
            </div>

            <div style="background: #F9FAFB; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 12px; color: #6B7280;">
                <strong>Transaction Details:</strong><br>
                • Transaction ID: ${data.transactionId}<br>
                • Message ID: ${data.messageId}<br>
                • Deadline: ${hoursRequested} hours<br>
                • Overdue by: ${Math.floor(data.minutesOverdue / 60)}h ${data.minutesOverdue % 60}m<br>
                • Refund Date: ${new Date().toLocaleString('fr-FR')}
            </div>
        </div>
        
        <div class="footer">
            <div style="font-weight: 600; margin-bottom: 10px;">FastPass</div>
            <div>We're sorry this didn't work out. We only succeed when you get responses!</div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                Questions? Reply to this email or contact support.
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
        to: [data.senderEmail],
        subject: `💰 Refund Processed - €${data.amount.toFixed(2)} returned (No response received)`,
        html: refundHtml
      })
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Resend API error:', errorText)
      throw new Error(`Email sending failed: ${errorText}`)
    }

    const emailResult = await emailResponse.json()
    console.log('Refund notification sent:', emailResult.id)

    // Log the notification
    await supabase.from('email_logs').insert({
      message_id: data.messageId,
      recipient_email: data.senderEmail,
      sender_email: 'system@fastpass.com',
      email_provider_id: emailResult.id,
      email_type: 'refund_notification',
      sent_at: new Date().toISOString(),
      metadata: {
        transaction_id: data.transactionId,
        refund_amount: data.amount,
        minutes_overdue: data.minutesOverdue
      }
    })

    return new Response(JSON.stringify({ 
      success: true,
      email_sent: true,
      email_id: emailResult.id,
      recipient: data.senderEmail
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error sending refund notification:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})