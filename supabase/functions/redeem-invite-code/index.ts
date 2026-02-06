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
    const { invite_code_id, user_id } = await req.json()

    if (!invite_code_id || !user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'invite_code_id and user_id are required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify profile is fully initialized (wait for triggers to complete)
    const { data: profile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id, created_at, invited_by_code')
      .eq('id', user_id)
      .single()

    if (profileCheckError || !profile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'profile not ready',
          message: 'User profile is still being created. Please try again in a moment.',
          retryable: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409 // Conflict - temporary issue
        }
      )
    }

    // Also check user_tiers exists (created by trigger)
    const { data: tierCheck } = await supabase
      .from('user_tiers')
      .select('id')
      .eq('user_id', user_id)
      .single()

    if (!tierCheck) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'profile not ready',
          message: 'User account is still being initialized. Please try again in a moment.',
          retryable: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409
        }
      )
    }

    // Check if user already redeemed a code (idempotency protection)
    if (profile.invited_by_code) {
      if (profile.invited_by_code === invite_code_id) {
        // Same code - idempotent success
        console.log(`User ${user_id} already redeemed this code - returning success (idempotent)`)
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Invite code already applied',
            already_redeemed: true
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      } else {
        // Different code - user already used another code
        return new Response(
          JSON.stringify({
            success: false,
            error: 'already redeemed',
            message: 'You have already used a different invite code',
            retryable: false
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }
    }

    // Verify the code exists and is still available
    const { data: inviteCode, error: lookupError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('id', invite_code_id)
      .single()

    if (lookupError || !inviteCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'not found',
          message: 'Invite code not found',
          retryable: false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }

    // Prevent self-invite (user using their own code)
    if (inviteCode.created_by_user_id === user_id) {
      console.warn(`Self-invite attempt blocked: user ${user_id} tried to use their own code`)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'self invite',
          message: 'You cannot use your own invite code',
          retryable: false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Check if already used
    if (inviteCode.used_by_user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'already used',
          message: 'This invite code has already been used',
          retryable: false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Check if active
    if (!inviteCode.is_active) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'deactivated',
          message: 'This invite code has been deactivated',
          retryable: false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Check expiration
    if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'expired',
          message: 'This invite code has expired',
          retryable: false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Mark the code as used
    const { error: updateError } = await supabase
      .from('invite_codes')
      .update({
        used_by_user_id: user_id,
        used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invite_code_id)

    if (updateError) {
      console.error('Error marking code as used:', updateError)
      throw updateError
    }

    // Update the user's profile with the invite code reference
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        invited_by_code: invite_code_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)

    if (profileError) {
      console.error('Error updating profile with invite code:', profileError)
      // Don't fail the request, just log it
    }

    // Generate 3 referral codes for the new user
    const newCodes = []
    for (let i = 0; i < 3; i++) {
      // Generate unique code
      const { data: codeResult, error: codeError } = await supabase.rpc('generate_invite_code', {
        prefix: 'FP'
      })

      if (codeError) {
        console.error('Error generating invite code:', codeError)
        continue
      }

      // Insert the code
      const { data: newCode, error: insertError } = await supabase
        .from('invite_codes')
        .insert({
          code: codeResult,
          code_type: 'referral',
          created_by_user_id: user_id
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting invite code:', insertError)
        continue
      }

      newCodes.push(newCode)
    }

    console.log(`Code ${inviteCode.code} redeemed by user ${user_id}. Generated ${newCodes.length} new codes.`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invite code redeemed successfully',
        redeemed_code: inviteCode.code,
        new_codes: newCodes.map(c => ({
          id: c.id,
          code: c.code,
          code_type: c.code_type
        }))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error redeeming invite code:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'server error',
        message: 'An error occurred while redeeming the code. Please try again.',
        retryable: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
