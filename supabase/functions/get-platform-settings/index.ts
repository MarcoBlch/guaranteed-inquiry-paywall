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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch all platform settings
    const { data: settings, error } = await supabase
      .from('platform_settings')
      .select('setting_key, setting_value, description, updated_at')

    if (error) {
      throw error
    }

    // Transform to key-value format
    const settingsMap: Record<string, any> = {}
    for (const setting of settings || []) {
      settingsMap[setting.setting_key] = {
        ...setting.setting_value,
        description: setting.description,
        updated_at: setting.updated_at
      }
    }

    // Public response - only include necessary settings
    const publicSettings = {
      invite_only_mode: {
        enabled: settingsMap.invite_only_mode?.enabled ?? true
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        settings: publicSettings
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error fetching platform settings:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch platform settings',
        // Default to invite-only mode on error for safety
        settings: {
          invite_only_mode: {
            enabled: true
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 with default settings on error
      }
    )
  }
})
