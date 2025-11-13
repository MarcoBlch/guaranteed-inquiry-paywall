import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderEmailData {
  recipientEmail: string
  senderEmail: string
  messageContent: string
  hoursLeft: number
  earnings: number
  expiresAt: Date
  messageId: string
}

function generateReminderEmailTemplate(data: ReminderEmailData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FASTPASS - Deadline Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">⏰ URGENT REMINDER</h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">FASTPASS message awaiting your response</p>
                        </td>
                    </tr>

                    <!-- Urgent Banner -->
                    <tr>
                        <td style="background-color: #FEF3C7; padding: 20px; text-align: center; border: 2px solid #F59E0B;">
                            <h2 style="margin: 0 0 10px 0; color: #92400E; font-size: 20px;">🚨 Only ${data.hoursLeft}h left to respond!</h2>
                            <p style="margin: 0; color: #B45309; font-size: 16px; font-weight: bold;">
                                Deadline: ${data.expiresAt.toLocaleDateString('en-US')} at ${data.expiresAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </td>
                    </tr>

                    <!-- Earnings Reminder -->
                    <tr>
                        <td style="padding: 30px;">
                            <div style="background-color: #f1f5f9; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
                                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">💰 Your earnings reminder</h3>
                                <div style="font-size: 32px; font-weight: bold; color: #4F46E5; margin: 10px 0;">€${data.earnings.toFixed(2)}</div>
                                <p style="margin: 0; color: #666; font-size: 14px;">awaiting your response</p>
                            </div>

                            <!-- Original Message -->
                            <div style="background-color: #EFF6FF; padding: 20px; border-radius: 6px; border-left: 4px solid #667eea; margin: 20px 0;">
                                <h4 style="margin: 0 0 10px 0; color: #333;">📧 Message from ${data.senderEmail}:</h4>
                                <div style="font-style: italic; color: #374151; line-height: 1.5;">
                                    ${data.messageContent.substring(0, 200)}${data.messageContent.length > 200 ? '...' : ''}
                                </div>
                            </div>

                            <!-- Response Instructions -->
                            <div style="background-color: #10B981; color: white; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
                                <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
                                    📧 REPLY TO THE ORIGINAL EMAIL TO RESPOND
                                </div>
                                <div style="font-size: 14px; opacity: 0.95; line-height: 1.5;">
                                    Simply reply to the message you received from reply+...@reply.fastpass.email<br>
                                    Don't miss this opportunity to earn €${data.earnings.toFixed(2)}!
                                </div>
                            </div>

                            <!-- Warning -->
                            <div style="background-color: #FEF2F2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #EF4444;">
                                <h4 style="margin: 0 0 10px 0; color: #B91C1C;">⚠️ What happens if I don't respond?</h4>
                                <p style="margin: 0; color: #B91C1C; font-size: 14px; line-height: 1.5;">
                                    The amount will be automatically refunded to the sender and you will receive no payment.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                            <p style="margin: 0; color: #666; font-size: 12px;">
                                FASTPASS - Guaranteed Response Message Service<br>
                                This is an automatic reminder. Time remaining: ${data.hoursLeft}h
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim()
}

function generateReminderEmailPlainText(data: ReminderEmailData): string {
  return `
FASTPASS - URGENT REMINDER

⏰ Only ${data.hoursLeft}h left to respond!

Deadline: ${data.expiresAt.toLocaleDateString('en-US')} at ${data.expiresAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}

💰 YOUR EARNINGS REMINDER
€${data.earnings.toFixed(2)} awaiting your response

📧 MESSAGE FROM ${data.senderEmail}:
${data.messageContent.substring(0, 200)}${data.messageContent.length > 200 ? '...' : ''}

HOW TO RESPOND:
Reply to the original email you received from reply+...@reply.fastpass.email
Don't miss this opportunity to earn €${data.earnings.toFixed(2)}!

⚠️ WARNING:
If you don't respond within ${data.hoursLeft}h, the amount will be automatically refunded to the sender and you will receive no payment.

---
FASTPASS - Guaranteed Response Message Service
This is an automatic reminder. Time remaining: ${data.hoursLeft}h
  `.trim()
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
    // FIXED: Use LEFT JOIN to avoid missing records due to broken relationships
    const { data: messagesNeedingReminder, error } = await supabase
      .from('escrow_transactions')
      .select(`
        id,
        message_id,
        amount,
        expires_at,
        recipient_user_id,
        sender_email,
        messages(
          id,
          content,
          sender_email,
          response_deadline_hours,
          created_at
        ),
        message_responses(
          has_response,
          id
        )
      `)
      .eq('status', 'held')
      .gt('expires_at', now.toISOString()) // Not expired yet

    if (error) throw error

    console.log(`Checking ${messagesNeedingReminder?.length || 0} active transactions for reminders`)

    let remindersSent = 0
    let remindersSkipped = 0
    let errorCount = 0

    for (const transaction of messagesNeedingReminder) {
      try {
        // Validate required data (handle LEFT JOIN nulls)
        if (!transaction.messages || !Array.isArray(transaction.messages) || transaction.messages.length === 0) {
          console.error(`Transaction ${transaction.id} missing messages data`)
          errorCount++
          continue
        }

        const message = transaction.messages[0]
        if (!message || !message.created_at || !message.content) {
          console.error(`Transaction ${transaction.id} has invalid message data`)
          errorCount++
          continue
        }

        // Check if response already received (handle null message_responses)
        const messageResponse = transaction.message_responses?.[0]
        if (messageResponse?.has_response === true) {
          remindersSkipped++
          continue // Response already received
        }

        const createdAt = new Date(message.created_at)
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
            errorCount++
            continue
          }

          const recipientEmail = userProfile.user.email
          const hoursLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))
          const earnings = transaction.amount * 0.75

          // Validate Postmark configuration
          const postmarkServerToken = Deno.env.get('POSTMARK_SERVER_TOKEN')
          if (!postmarkServerToken) {
            throw new Error('POSTMARK_SERVER_TOKEN not configured')
          }

          // Prepare email data
          const emailData: ReminderEmailData = {
            recipientEmail,
            senderEmail: message.sender_email || transaction.sender_email,
            messageContent: message.content,
            hoursLeft,
            earnings,
            expiresAt,
            messageId: transaction.message_id
          }

          const htmlContent = generateReminderEmailTemplate(emailData)
          const textContent = generateReminderEmailPlainText(emailData)

          // Send reminder via Postmark
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
              Subject: `🚨 URGENT - Only ${hoursLeft}h left to earn €${earnings.toFixed(2)}`,
              HtmlBody: htmlContent,
              TextBody: textContent,
              MessageStream: 'outbound',
              TrackOpens: true,
              TrackLinks: 'HtmlAndText',
              Headers: [
                {
                  Name: 'X-Fastpass-Message-Id',
                  Value: transaction.message_id
                },
                {
                  Name: 'X-Fastpass-Reminder-Type',
                  Value: 'deadline'
                },
                {
                  Name: 'X-Fastpass-Hours-Left',
                  Value: hoursLeft.toString()
                }
              ],
              Metadata: {
                messageId: transaction.message_id,
                reminderType: 'deadline',
                hoursLeft: hoursLeft.toString(),
                earnings: earnings.toString()
              }
            })
          })

          if (emailResponse.ok) {
            const emailResult = await emailResponse.json()

            // Log the reminder
            await supabase.from('email_logs').insert({
              message_id: transaction.message_id,
              recipient_email: recipientEmail,
              sender_email: 'FASTPASS <noreply@fastpass.email>',
              email_provider_id: emailResult.MessageID,
              email_type: 'deadline_reminder',
              email_service_provider: 'postmark',
              sent_at: now.toISOString(),
              metadata: {
                hours_left: hoursLeft,
                earnings: earnings,
                reminder_trigger: 'halfway_deadline',
                postmark_message_id: emailResult.MessageID,
                to: emailResult.To,
                submitted_at: emailResult.SubmittedAt
              }
            })

            console.log(`Reminder sent for message ${transaction.message_id} to ${recipientEmail}`)
            remindersSent++
          } else {
            const errorText = await emailResponse.text()
            console.error(`Failed to send reminder for ${transaction.message_id}:`, errorText)
            errorCount++
          }
        } else {
          remindersSkipped++ // Not yet at halfway point
        }
      } catch (reminderError) {
        console.error(`Error processing reminder for transaction ${transaction.id}:`, reminderError)
        errorCount++
      }
    }

    return new Response(JSON.stringify({
      success: true,
      reminders_sent: remindersSent,
      reminders_skipped: remindersSkipped,
      errors: errorCount,
      total_checked: messagesNeedingReminder?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error sending deadline reminders:', error)
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
