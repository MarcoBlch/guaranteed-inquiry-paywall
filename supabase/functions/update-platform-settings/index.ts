import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Allowed settings that can be updated
const ALLOWED_SETTINGS = ['invite_only_mode', 'default_revenue_split', 'early_adopter_revenue_split']

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { setting_key, value } = await req.json()

    // Validate setting_key
    if (!setting_key || !ALLOWED_SETTINGS.includes(setting_key)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid setting_key. Allowed: ${ALLOWED_SETTINGS.join(', ')}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Validate value
    if (value === undefined || value === null) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'value is required'
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

    // Extract token and create service role client for admin verification
    const token = authHeader.replace('Bearer ', '')
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the user using service role
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

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

    // Check admin status using service role
    const { data: profile, error: profileError } = await supabaseAdmin
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

    // Use service role for the update since admin is already verified
    // RLS policies allow service_role full access
    const { data: currentSetting } = await supabaseAdmin
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', setting_key)
      .single()

    // Update the setting using service role (bypasses RLS after admin verification)
    const { data: updatedSetting, error: updateError } = await supabaseAdmin
      .from('platform_settings')
      .update({
        setting_value: value,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', setting_key)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Log the action using service role
    await supabaseAdmin.from('admin_actions').insert({
      admin_user_id: user.id,
      action_type: 'update_platform_setting',
      description: `Updated ${setting_key}`,
      metadata: {
        setting_key,
        old_value: currentSetting?.setting_value,
        new_value: value,
        updated_by_user_id: user.id
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Setting ${setting_key} updated successfully`,
        setting: {
          key: setting_key,
          value: updatedSetting.setting_value
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error updating platform setting:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to update platform setting'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
