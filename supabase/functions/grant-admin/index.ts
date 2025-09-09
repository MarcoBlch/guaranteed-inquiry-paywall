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
    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email } = await req.json()
    
    if (!email) {
      throw new Error('Email is required')
    }

    // Find user by email
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (userError) {
      throw new Error(`Error finding user: ${userError.message}`)
    }

    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      throw new Error(`User with email ${email} not found`)
    }

    // Update profile to grant admin privileges
    const { data: profile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', user.id)
      .select('*')
      .single()

    if (updateError) {
      throw new Error(`Error updating profile: ${updateError.message}`)
    }

    console.log(`Admin privileges granted to ${email} (${user.id})`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Admin privileges granted to ${email}`,
        profile: profile
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Grant admin error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})