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
          error: 'Invite code not found'
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
          error: 'You cannot use your own invite code'
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
          error: 'This invite code has already been used'
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
          error: 'This invite code has been deactivated'
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
          error: 'This invite code has expired'
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
        error: 'An error occurred while redeeming the code'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
