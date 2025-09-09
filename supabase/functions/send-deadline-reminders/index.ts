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

    const now = new Date()
    
    // Find messages that need reminders (50% of deadline passed, no response, reminder not sent)
    const { data: messagesNeedingReminder, error } = await supabase
      .from('escrow_transactions')
      .select(`
        id,
        message_id,
        amount,
        expires_at,
        recipient_user_id,
        sender_email,
        messages!inner(
          id,
          content,
          sender_email,
          response_deadline_hours,
          created_at
        ),
        message_responses!inner(
          has_response,
          id
        )
      `)
      .eq('status', 'held')
      .eq('message_responses.has_response', false)
      .gt('expires_at', now.toISOString()) // Not expired yet

    if (error) throw error

    console.log(`Checking ${messagesNeedingReminder.length} active transactions for reminders`)

    let remindersSent = 0
    let remindersSkipped = 0

    for (const transaction of messagesNeedingReminder) {
      try {
        const createdAt = new Date(transaction.messages.created_at)
        const expiresAt = new Date(transaction.expires_at)
        const totalDuration = expiresAt.getTime() - createdAt.getTime()
        const halfwayPoint = new Date(createdAt.getTime() + (totalDuration / 2))
        
        // Check if we're past the halfway point (50% of deadline)
        if (now >= halfwayPoint) {
          
          // Check if reminder was already sent
          const { data: existingReminder } = await supabase
            .from('email_logs')
            .select('id')
            .eq('message_id', transaction.message_id)
            .eq('email_type', 'deadline_reminder')
            .single()

          if (existingReminder) {
            remindersSkipped++
            continue // Reminder already sent
          }

          // Get recipient email
          const { data: userProfile, error: profileError } = await supabase.auth.admin.getUserById(transaction.recipient_user_id)
          
          if (profileError || !userProfile?.user?.email) {
            console.error(`Failed to get recipient email for ${transaction.recipient_user_id}`)
            continue
          }

          const recipientEmail = userProfile.user.email
          const hoursLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))
          const earnings = transaction.amount * 0.75
          const baseUrl = req.headers.get('origin') || 'https://votre-domaine.com'
          const responseUrl = `${baseUrl}/respond/${transaction.message_id}`

          // Send reminder email
          const reminderHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>FastPass - Rappel de Délai</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 30px 20px; text-align: center; }
        .urgent { background: #FEF3C7; border: 2px solid #F59E0B; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .cta-button { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 18px 36px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 18px; margin: 25px 0; }
        .content { padding: 30px; }
        .footer { text-align: center; padding: 30px; background: #f8fafc; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Rappel Urgent</h1>
            <div>Message FastPass en attente de réponse</div>
        </div>
        
        <div class="content">
            <div class="urgent">
                <h2 style="margin: 0 0 15px 0; color: #92400E;">🚨 Plus que ${hoursLeft}h pour répondre!</h2>
                <div style="font-size: 18px; font-weight: bold; color: #B45309;">
                    Délai expire le ${expiresAt.toLocaleDateString('fr-FR')} à ${expiresAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0;">💰 Rappel de votre gain</h3>
                <div style="font-size: 24px; font-weight: bold; color: #4F46E5;">€${earnings.toFixed(2)}</div>
                <div>vous attendent en échange de votre réponse</div>
            </div>
            
            <div style="background: #EFF6FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0;">📧 Message de ${transaction.sender_email}:</h4>
                <div style="font-style: italic; color: #374151; max-height: 100px; overflow: hidden;">
                  ${transaction.messages.content.substring(0, 200)}${transaction.messages.content.length > 200 ? '...' : ''}
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="${responseUrl}" class="cta-button">
                    ⚡ RÉPONDRE MAINTENANT
                </a>
                <div style="margin-top: 15px; font-size: 14px; color: #64748b;">
                    Ne perdez pas cette opportunité de gagner €${earnings.toFixed(2)} !
                </div>
            </div>
            
            <div style="background: #FEF2F2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
                <h4 style="margin: 0 0 10px 0; color: #B91C1C;">⚠️ Que se passe-t-il si je ne réponds pas?</h4>
                <p style="margin: 0; color: #B91C1C; font-size: 14px;">
                    Le montant sera automatiquement remboursé à l'expéditeur et vous ne recevrez aucun paiement.
                </p>
            </div>
        </div>
        
        <div class="footer">
            <div>FastPass - Service de Messages avec Réponse Garantie</div>
            <div style="margin-top: 10px;">
                Ceci est un rappel automatique. Temps restant: ${hoursLeft}h
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
              subject: `🚨 URGENT - Plus que ${hoursLeft}h pour répondre et recevoir €${earnings.toFixed(2)}`,
              html: reminderHtml
            })
          })

          if (emailResponse.ok) {
            const emailResult = await emailResponse.json()
            
            // Log the reminder
            await supabase.from('email_logs').insert({
              message_id: transaction.message_id,
              recipient_email: recipientEmail,
              sender_email: transaction.sender_email,
              email_provider_id: emailResult.id,
              email_type: 'deadline_reminder',
              sent_at: now.toISOString(),
              metadata: {
                hours_left: hoursLeft,
                earnings: earnings,
                reminder_trigger: 'halfway_deadline'
              }
            })

            console.log(`Reminder sent for message ${transaction.message_id} to ${recipientEmail}`)
            remindersSent++
          } else {
            console.error(`Failed to send reminder for ${transaction.message_id}:`, await emailResponse.text())
          }
        } else {
          remindersSkipped++ // Not yet at halfway point
        }
      } catch (reminderError) {
        console.error(`Error processing reminder for transaction ${transaction.id}:`, reminderError)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      reminders_sent: remindersSent,
      reminders_skipped: remindersSkipped,
      total_checked: messagesNeedingReminder.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error sending deadline reminders:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})