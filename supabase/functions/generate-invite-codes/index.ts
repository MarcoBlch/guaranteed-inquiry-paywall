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
    const { code_type, count = 1 } = await req.json()

    // Validate code_type
    if (!['founder', 'referral'].includes(code_type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'code_type must be "founder" or "referral"'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Validate count
    const numCodes = Math.min(Math.max(1, parseInt(count) || 1), 50) // Max 50 at once

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

    // Get user's profile to check admin status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError) {
      throw profileError
    }

    // Founder codes require admin privileges
    if (code_type === 'founder' && !profile.is_admin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Admin privileges required to generate founder codes'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        }
      )
    }

    // For referral codes, check user's limit
    if (code_type === 'referral') {
      // Get user's existing referral code count
      const { count: existingCount, error: countError } = await supabase
        .from('invite_codes')
        .select('*', { count: 'exact', head: true })
        .eq('created_by_user_id', user.id)
        .eq('code_type', 'referral')

      if (countError) {
        throw countError
      }

      // Get user's tier to check limit
      const { data: userTier } = await supabase
        .from('user_tiers')
        .select('invite_codes_limit')
        .eq('user_id', user.id)
        .single()

      const limit = userTier?.invite_codes_limit ?? 3

      if ((existingCount ?? 0) >= limit) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `You have reached your limit of ${limit} referral codes`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }

      // Limit generation to remaining quota
      const remaining = limit - (existingCount ?? 0)
      if (numCodes > remaining) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `You can only generate ${remaining} more referral codes`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }
    }

    // Generate the codes
    const generatedCodes = []
    const prefix = code_type === 'founder' ? 'FOUNDER' : 'FP'

    for (let i = 0; i < numCodes; i++) {
      // Generate unique code using database function
      const { data: codeResult, error: codeError } = await supabase.rpc('generate_invite_code', {
        prefix
      })

      if (codeError) {
        console.error('Error generating code:', codeError)
        continue
      }

      // Insert the code
      const { data: newCode, error: insertError } = await supabase
        .from('invite_codes')
        .insert({
          code: codeResult,
          code_type,
          created_by_user_id: user.id
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting code:', insertError)
        continue
      }

      generatedCodes.push(newCode)
    }

    // Log admin action if founder codes
    if (code_type === 'founder' && generatedCodes.length > 0) {
      await supabase.from('admin_actions').insert({
        admin_user_id: user.id,
        action_type: 'generate_founder_codes',
        description: `Generated ${generatedCodes.length} founder invite codes`,
        metadata: {
          codes: generatedCodes.map(c => c.code),
          count: generatedCodes.length
        }
      })
    }

    console.log(`Generated ${generatedCodes.length} ${code_type} codes for user ${user.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${generatedCodes.length} invite codes`,
        codes: generatedCodes.map(c => ({
          id: c.id,
          code: c.code,
          code_type: c.code_type,
          created_at: c.created_at
        }))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error generating invite codes:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred while generating codes'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
