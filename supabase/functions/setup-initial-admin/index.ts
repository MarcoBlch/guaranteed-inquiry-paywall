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
    // Create admin client with service role key
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

    const adminEmail = 'marc.bernard@ece-france.com'
    
    console.log(`Setting up initial admin: ${adminEmail}`)

    // First, find the user by email using admin privileges
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (userError) {
      throw new Error(`Error fetching users: ${userError.message}`)
    }

    const targetUser = users.users.find(u => u.email === adminEmail)
    
    if (!targetUser) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `User ${adminEmail} not found. They need to sign up first.`,
          action: 'user_signup_required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        },
      )
    }

    // Check if profile exists
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, is_admin')
      .eq('id', targetUser.id)
      .single()

    if (profileCheckError && profileCheckError.code !== 'PGRST116') { // Not found is ok
      throw new Error(`Error checking profile: ${profileCheckError.message}`)
    }

    // Use raw SQL to bypass the admin escalation trigger temporarily
    const { data: result, error: sqlError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Temporarily disable the trigger
        ALTER TABLE public.profiles DISABLE TRIGGER trigger_prevent_admin_escalation;
        
        -- Insert or update the profile to be admin
        INSERT INTO public.profiles (id, is_admin, updated_at) 
        VALUES ($1, true, now()) 
        ON CONFLICT (id) DO UPDATE SET 
          is_admin = true, 
          updated_at = now();
        
        -- Re-enable the trigger
        ALTER TABLE public.profiles ENABLE TRIGGER trigger_prevent_admin_escalation;
        
        SELECT 'Admin privileges granted successfully' as message;
      `,
      params: [targetUser.id]
    })

    // If the RPC doesn't exist, try direct update with admin client
    if (sqlError) {
      console.log('RPC method failed, trying direct update...')
      
      // Direct update using service role (should bypass RLS)
      const { data: updateResult, error: updateError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: targetUser.id,
          is_admin: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select()

      if (updateError) {
        throw new Error(`Direct update failed: ${updateError.message}`)
      }

      console.log(`Direct update successful:`, updateResult)
    }

    // Verify the admin privilege was granted
    const { data: verifyProfile, error: verifyError } = await supabaseAdmin
      .from('profiles')
      .select('id, is_admin')
      .eq('id', targetUser.id)
      .single()

    if (verifyError) {
      throw new Error(`Verification failed: ${verifyError.message}`)
    }

    // Log the admin creation in security audit
    const { error: auditError } = await supabaseAdmin
      .from('security_audit')
      .insert({
        user_id: targetUser.id,
        event_type: 'initial_admin_setup',
        event_data: {
          email: adminEmail,
          granted_by: 'setup_function',
          timestamp: new Date().toISOString()
        }
      })

    if (auditError) {
      console.warn('Audit log failed:', auditError.message)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Admin privileges successfully granted to ${adminEmail}`,
        user_id: targetUser.id,
        is_admin: verifyProfile.is_admin,
        profile_exists: !!existingProfile
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Setup initial admin error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: 'Check server logs for more information'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})