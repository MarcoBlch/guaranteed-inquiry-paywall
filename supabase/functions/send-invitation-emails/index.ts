import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  generateInvitationEmailTemplate,
  generateInvitationEmailPlainText,
  prepareInvitationEmailData
} from '../_shared/invitation-email-template.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvitationRequest {
  id: string;
  email: string;
  status: string;
  created_at: string;
}

interface SendResult {
  email: string;
  success: boolean;
  code?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { batch_size = 10, code_type = 'founder', dry_run = false } = await req.json()

    console.log(`Processing invitation email batch: size=${batch_size}, type=${code_type}, dry_run=${dry_run}`)

    // Validate batch size (1-50)
    const validBatchSize = Math.min(Math.max(1, parseInt(batch_size) || 10), 50)

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authorization required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the current user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid authorization'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // Check admin privileges
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Admin privileges required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        }
      )
    }

    // Query pending/approved invitation requests (FIFO order)
    const { data: requests, error: queryError } = await supabase
      .from('invitation_email_requests')
      .select('id, email, status, created_at')
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: true })
      .limit(validBatchSize)

    if (queryError) {
      throw queryError
    }

    if (!requests || requests.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending invitation requests found',
          sent_count: 0,
          failed_count: 0,
          results: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log(`Found ${requests.length} pending invitation requests`)

    // If dry run, return preview without sending
    if (dry_run) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Dry run: Would send ${requests.length} invitations`,
          preview: requests.map(r => ({
            email: r.email,
            created_at: r.created_at
          }))
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    const postmarkServerToken = Deno.env.get('POSTMARK_SERVER_TOKEN')
    if (!postmarkServerToken) {
      throw new Error('POSTMARK_SERVER_TOKEN not configured')
    }

    const results: SendResult[] = []
    let sentCount = 0
    let failedCount = 0

    // Process each request
    for (const request of requests) {
      try {
        // 1. Generate invite code
        const { data: codeString, error: codeError } = await supabase.rpc('generate_invite_code', {
          prefix: 'FOUNDER'
        })

        if (codeError || !codeString) {
          console.error(`Failed to generate code for ${request.email}:`, codeError)
          results.push({
            email: request.email,
            success: false,
            error: 'Failed to generate invite code'
          })
          failedCount++
          continue
        }

        // 2. Insert the code into invite_codes table
        const { data: newCode, error: insertError } = await supabase
          .from('invite_codes')
          .insert({
            code: codeString,
            code_type: 'founder',
            created_by_user_id: user.id
          })
          .select()
          .single()

        if (insertError || !newCode) {
          console.error(`Failed to insert code for ${request.email}:`, insertError)
          results.push({
            email: request.email,
            success: false,
            error: 'Failed to create invite code record'
          })
          failedCount++
          continue
        }

        // 3. Prepare email template data
        const emailData = prepareInvitationEmailData(
          request.email,
          codeString,
          'https://fastpass.email'
        )

        const htmlContent = generateInvitationEmailTemplate(emailData)
        const textContent = generateInvitationEmailPlainText(emailData)

        // 4. Send email via Postmark
        const emailResponse = await fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': postmarkServerToken,
          },
          body: JSON.stringify({
            From: 'FASTPASS <contact@fastpass.email>',
            To: request.email,
            ReplyTo: 'contact@fastpass.email',
            Subject: '🎉 Your FastPass Beta Invitation is Here!',
            HtmlBody: htmlContent,
            TextBody: textContent,
            MessageStream: 'outbound',
            TrackOpens: true,
            TrackLinks: 'HtmlAndText',
            Headers: [
              {
                Name: 'X-Fastpass-Invitation-Request-Id',
                Value: request.id
              },
              {
                Name: 'X-Fastpass-Invite-Code',
                Value: codeString
              }
            ],
            Metadata: {
              request_id: request.id,
              code: codeString,
              code_type: 'founder'
            }
          }),
        })

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text()
          console.error(`Postmark API error for ${request.email}:`, errorText)

          // Rollback: Delete the invite code since email failed
          await supabase
            .from('invite_codes')
            .delete()
            .eq('id', newCode.id)

          results.push({
            email: request.email,
            success: false,
            error: `Email delivery failed: ${errorText}`
          })
          failedCount++
          continue
        }

        const postmarkResult = await emailResponse.json()
        console.log(`Email sent successfully to ${request.email}:`, postmarkResult.MessageID)

        // 5. Update invitation request status
        const { error: updateError } = await supabase
          .from('invitation_email_requests')
          .update({
            status: 'invited',
            invite_code_sent: newCode.id,
            invited_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', request.id)

        if (updateError) {
          console.error(`Failed to update request ${request.id}:`, updateError)
          // Don't fail the whole operation - email was sent successfully
        }

        // 6. Log to email_logs
        await supabase.from('email_logs').insert({
          recipient_email: request.email,
          sender_email: 'FASTPASS <contact@fastpass.email>',
          email_provider_id: postmarkResult.MessageID,
          email_type: 'invitation_code_distribution',
          email_service_provider: 'postmark',
          sent_at: new Date().toISOString(),
          metadata: {
            to: postmarkResult.To,
            submitted_at: postmarkResult.SubmittedAt,
            postmark_id: postmarkResult.MessageID,
            request_id: request.id,
            code: codeString
          }
        })

        results.push({
          email: request.email,
          success: true,
          code: codeString
        })
        sentCount++

      } catch (error) {
        console.error(`Error processing ${request.email}:`, error)
        results.push({
          email: request.email,
          success: false,
          error: error.message || 'Unknown error'
        })
        failedCount++
      }
    }

    // Log admin action
    if (sentCount > 0) {
      await supabase.from('admin_actions').insert({
        admin_user_id: user.id,
        action_type: 'send_invitation_emails',
        description: `Sent ${sentCount} invitation emails (${failedCount} failed)`,
        metadata: {
          batch_size: validBatchSize,
          sent_count: sentCount,
          failed_count: failedCount,
          code_type: 'founder',
          results: results
        }
      })
    }

    console.log(`Batch complete: ${sentCount} sent, ${failedCount} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${sentCount} invitations (${failedCount} failed)`,
        sent_count: sentCount,
        failed_count: failedCount,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error sending invitation emails:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred while sending invitations'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
