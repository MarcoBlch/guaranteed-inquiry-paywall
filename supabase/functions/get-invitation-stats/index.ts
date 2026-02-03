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

    // Check admin privileges
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

    // Get overall stats
    const { data: requests, error: requestsError } = await supabase
      .from('invitation_email_requests')
      .select('id, email, status, invited_at, invite_code_sent, created_at')

    if (requestsError) {
      throw requestsError
    }

    // Calculate stats
    const pendingCount = requests?.filter(r => r.status === 'pending').length || 0
    const invitedThisWeek = requests?.filter(r => {
      if (r.status !== 'invited' || !r.invited_at) return false
      const invitedDate = new Date(r.invited_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return invitedDate > weekAgo
    }).length || 0
    const totalInvited = requests?.filter(r => r.status === 'invited').length || 0

    // Get redemption data by joining with invite_codes
    const invitedRequests = requests?.filter(r => r.status === 'invited' && r.invite_code_sent) || []

    let redeemedCount = 0
    const recentInvitations: any[] = []

    // Fetch invite code details for redeemed status
    for (const request of invitedRequests.slice(0, 20)) { // Limit to 20 recent
      if (!request.invite_code_sent) continue

      const { data: inviteCode } = await supabase
        .from('invite_codes')
        .select('code, redeemed_by, redeemed_at')
        .eq('id', request.invite_code_sent)
        .single()

      if (inviteCode) {
        const isRedeemed = !!inviteCode.redeemed_by

        if (isRedeemed) {
          redeemedCount++
        }

        // Add to recent invitations (only for display)
        if (recentInvitations.length < 20) {
          recentInvitations.push({
            email: request.email,
            invited_at: request.invited_at,
            code: inviteCode.code,
            redeemed: isRedeemed,
            redeemed_at: inviteCode.redeemed_at || null
          })
        }
      }
    }

    // Calculate redemption rate from all invited codes
    const { data: allInvitedCodes } = await supabase
      .from('invitation_email_requests')
      .select('invite_code_sent')
      .eq('status', 'invited')
      .not('invite_code_sent', 'is', null)

    let totalRedeemedCount = 0
    if (allInvitedCodes && allInvitedCodes.length > 0) {
      const codeIds = allInvitedCodes.map(r => r.invite_code_sent).filter(Boolean)

      const { data: codes } = await supabase
        .from('invite_codes')
        .select('redeemed_by')
        .in('id', codeIds)

      totalRedeemedCount = codes?.filter(c => c.redeemed_by !== null).length || 0
    }

    const redemptionRate = totalInvited > 0
      ? Math.round((totalRedeemedCount / totalInvited) * 100)
      : 0

    // Sort recent invitations by invited_at (descending)
    recentInvitations.sort((a, b) => {
      return new Date(b.invited_at).getTime() - new Date(a.invited_at).getTime()
    })

    const stats = {
      pending_count: pendingCount,
      invited_this_week: invitedThisWeek,
      total_invited: totalInvited,
      redemption_rate: redemptionRate,
      recent_invitations: recentInvitations
    }

    console.log('Invitation stats:', stats)

    return new Response(
      JSON.stringify({
        success: true,
        data: stats
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error fetching invitation stats:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred while fetching stats'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
