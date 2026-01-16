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
    const { code } = await req.json()

    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Invite code is required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Normalize code to uppercase
    const normalizedCode = code.toUpperCase().trim()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Look up the invite code
    const { data: inviteCode, error: lookupError } = await supabase
      .from('invite_codes')
      .select(`
        id,
        code,
        code_type,
        created_by_user_id,
        used_by_user_id,
        used_at,
        expires_at,
        is_active,
        created_at
      `)
      .eq('code', normalizedCode)
      .single()

    if (lookupError || !inviteCode) {
      console.log(`Invalid code attempt: ${normalizedCode}`)
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Invalid invite code'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Return 200 so frontend can handle gracefully
        }
      )
    }

    // Check if code is already used
    if (inviteCode.used_by_user_id) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'This invite code has already been used'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Check if code is active
    if (!inviteCode.is_active) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'This invite code has been deactivated'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Check if code is expired
    if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'This invite code has expired'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Code is valid - return success with code details
    console.log(`Valid code validated: ${normalizedCode} (${inviteCode.code_type})`)

    return new Response(
      JSON.stringify({
        valid: true,
        code: inviteCode.code,
        code_type: inviteCode.code_type,
        invite_code_id: inviteCode.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error validating invite code:', error)
    return new Response(
      JSON.stringify({
        valid: false,
        error: 'An error occurred while validating the code'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
