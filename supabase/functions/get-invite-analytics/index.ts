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

    // Verify the user
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

    // Check admin status
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

    // Fetch all invite codes
    const { data: allCodes, error: codesError } = await supabase
      .from('invite_codes')
      .select(`
        id,
        code,
        code_type,
        created_by_user_id,
        used_by_user_id,
        used_at,
        is_active,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (codesError) {
      throw codesError
    }

    // Calculate statistics
    const totalCodes = allCodes?.length || 0
    const founderCodes = allCodes?.filter(c => c.code_type === 'founder') || []
    const referralCodes = allCodes?.filter(c => c.code_type === 'referral') || []
    const usedCodes = allCodes?.filter(c => c.used_by_user_id) || []

    const founderUsed = founderCodes.filter(c => c.used_by_user_id).length
    const referralUsed = referralCodes.filter(c => c.used_by_user_id).length

    // Fetch user tier distribution
    const { data: tierData, error: tierError } = await supabase
      .from('user_tiers')
      .select('tier, revenue_percentage')

    if (tierError) {
      throw tierError
    }

    const tierCounts = {
      founder: 0,
      early_adopter: 0,
      standard: 0
    }

    for (const tier of tierData || []) {
      if (tier.tier in tierCounts) {
        tierCounts[tier.tier as keyof typeof tierCounts]++
      }
    }

    // Get top referrers
    const { data: topReferrers, error: referrersError } = await supabase
      .from('user_tiers')
      .select(`
        user_id,
        tier,
        referral_count,
        revenue_percentage,
        profiles!inner(email, display_name)
      `)
      .gt('referral_count', 0)
      .order('referral_count', { ascending: false })
      .limit(10)

    if (referrersError) {
      console.error('Error fetching top referrers:', referrersError)
    }

    // Get recent code usage (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentUsage = usedCodes.filter(c =>
      c.used_at && new Date(c.used_at) > sevenDaysAgo
    ).length

    // Calculate redemption rate
    const redemptionRate = totalCodes > 0
      ? ((usedCodes.length / totalCodes) * 100).toFixed(1)
      : '0.0'

    // Get platform settings
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('setting_key, setting_value')

    const inviteOnlyEnabled = settings?.find(s => s.setting_key === 'invite_only_mode')
      ?.setting_value?.enabled ?? true

    const analytics = {
      overview: {
        total_codes: totalCodes,
        used_codes: usedCodes.length,
        available_codes: totalCodes - usedCodes.length,
        redemption_rate: `${redemptionRate}%`,
        recent_usage_7d: recentUsage,
        invite_only_enabled: inviteOnlyEnabled
      },
      by_type: {
        founder: {
          total: founderCodes.length,
          used: founderUsed,
          available: founderCodes.length - founderUsed
        },
        referral: {
          total: referralCodes.length,
          used: referralUsed,
          available: referralCodes.length - referralUsed
        }
      },
      user_tiers: {
        founder: tierCounts.founder,
        early_adopter: tierCounts.early_adopter,
        standard: tierCounts.standard,
        total: tierData?.length || 0
      },
      top_referrers: (topReferrers || []).map(r => ({
        email: r.profiles?.email,
        display_name: r.profiles?.display_name,
        referral_count: r.referral_count,
        tier: r.tier,
        revenue_percentage: `${(r.revenue_percentage * 100).toFixed(0)}%`
      })),
      recent_codes: (allCodes || []).slice(0, 20).map(c => ({
        code: c.code,
        code_type: c.code_type,
        is_used: !!c.used_by_user_id,
        is_active: c.is_active,
        created_at: c.created_at,
        used_at: c.used_at
      }))
    }

    return new Response(
      JSON.stringify({
        success: true,
        analytics
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error fetching invite analytics:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch invite analytics'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
