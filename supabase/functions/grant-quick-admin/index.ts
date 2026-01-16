import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email is required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

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

    // Verify the requesting user
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

    // Check if requesting user is admin
    const { data: requestingProfile, error: requestingError } = await supabase
      .from('profiles')
      .select('is_admin, email')
      .eq('id', user.id)
      .single()

    if (requestingError || !requestingProfile?.is_admin) {
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

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Find target user by email (via auth.users)
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      throw listError
    }

    const targetAuthUser = authUsers.users.find(
      u => u.email?.toLowerCase() === normalizedEmail
    )

    if (!targetAuthUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `No user found with email: ${normalizedEmail}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }

    // Check if already admin
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('id, is_admin, email')
      .eq('id', targetAuthUser.id)
      .single()

    if (targetError) {
      throw targetError
    }

    if (targetProfile.is_admin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `${normalizedEmail} is already an admin`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Grant admin status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_admin: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetAuthUser.id)

    if (updateError) {
      throw updateError
    }

    // Log the action
    await supabase.from('admin_actions').insert({
      admin_user_id: user.id,
      action_type: 'grant_admin',
      description: `Granted admin privileges to ${normalizedEmail}`,
      metadata: {
        target_user_id: targetAuthUser.id,
        target_email: normalizedEmail,
        granted_by_email: requestingProfile.email
      }
    })

    // Also log to security_audit
    await supabase.from('security_audit').insert({
      user_id: targetAuthUser.id,
      event_type: 'admin_granted',
      event_data: {
        granted_by: user.id,
        granted_by_email: requestingProfile.email
      }
    })

    console.log(`Admin privileges granted to ${normalizedEmail} by ${requestingProfile.email}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Admin privileges granted to ${normalizedEmail}`,
        user: {
          id: targetAuthUser.id,
          email: normalizedEmail
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error granting admin privileges:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to grant admin privileges'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
