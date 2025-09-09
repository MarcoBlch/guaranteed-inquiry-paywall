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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get the JWT token and verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid or expired token')
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      throw new Error('Access denied. Admin privileges required.')
    }

    // Platform-wide analytics (Admin only)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString()

    // Get platform-wide revenue data
    const { data: allTransactions } = await supabaseClient
      .from('escrow_transactions')
      .select('amount, created_at, status, recipient_user_id')

    // Get platform-wide message data  
    const { data: allMessages } = await supabaseClient
      .from('messages')
      .select(`
        id, 
        created_at,
        user_id,
        message_responses (
          has_response,
          response_received_at
        )
      `)

    // Get user data
    const { data: allUsers } = await supabaseClient
      .from('profiles')
      .select('id, created_at')

    // Get email logs
    const { data: emailLogs } = await supabaseClient
      .from('email_logs')
      .select('email_type, created_at, opened_at, clicked_at, delivered_at, failed_at')
      .gte('created_at', thirtyDaysAgoIso)

    // Calculate comprehensive KPIs
    const now = new Date()
    const recentTransactions = allTransactions?.filter(t => 
      new Date(t.created_at) >= thirtyDaysAgo && t.status === 'released'
    ) || []

    const recentMessages = allMessages?.filter(m => 
      new Date(m.created_at) >= thirtyDaysAgo
    ) || []

    const respondedMessages = recentMessages.filter(m => 
      m.message_responses && m.message_responses.length > 0 && m.message_responses[0].has_response
    )

    const recentUsers = allUsers?.filter(u => 
      new Date(u.created_at) >= thirtyDaysAgo
    ) || []

    // Platform revenue calculations
    const totalPlatformRevenue = allTransactions?.filter(t => t.status === 'released')
      .reduce((sum, t) => sum + (t.amount * 0.25), 0) || 0 // 25% platform fee
    
    const monthlyPlatformRevenue = recentTransactions.reduce((sum, t) => sum + (t.amount * 0.25), 0)
    
    const totalUserPayouts = allTransactions?.filter(t => t.status === 'released')
      .reduce((sum, t) => sum + (t.amount * 0.75), 0) || 0 // 75% to users

    // User analytics
    const totalUsers = allUsers?.length || 0
    const activeUsers = new Set(recentMessages.map(m => m.user_id)).size
    const newUsers = recentUsers.length

    // Message analytics  
    const totalMessages = allMessages?.length || 0
    const monthlyMessages = recentMessages.length
    const responseRate = recentMessages.length > 0 ? (respondedMessages.length / recentMessages.length * 100) : 0

    // Email analytics
    const emailsSent = emailLogs?.length || 0
    const emailsDelivered = emailLogs?.filter(e => e.delivered_at).length || 0
    const emailsOpened = emailLogs?.filter(e => e.opened_at).length || 0
    const emailsClicked = emailLogs?.filter(e => e.clicked_at).length || 0
    const emailsFailed = emailLogs?.filter(e => e.failed_at).length || 0

    // Top performers
    const userRevenue = new Map()
    allTransactions?.filter(t => t.status === 'released').forEach(t => {
      const userId = t.recipient_user_id
      const earnings = t.amount * 0.75
      userRevenue.set(userId, (userRevenue.get(userId) || 0) + earnings)
    })
    const topEarners = Array.from(userRevenue.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([userId, earnings]) => ({ userId, earnings }))

    const analytics = {
      // Revenue metrics
      totalPlatformRevenue: Math.round(totalPlatformRevenue * 100) / 100,
      monthlyPlatformRevenue: Math.round(monthlyPlatformRevenue * 100) / 100,
      totalUserPayouts: Math.round(totalUserPayouts * 100) / 100,
      averageTransactionValue: recentTransactions.length > 0 ? 
        Math.round((recentTransactions.reduce((sum, t) => sum + t.amount, 0) / recentTransactions.length) * 100) / 100 : 0,
      
      // User metrics
      totalUsers,
      activeUsers,
      newUsers,
      userRetentionRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers * 100) * 10) / 10 : 0,
      
      // Message metrics
      totalMessages,
      monthlyMessages,
      responseRate: Math.round(responseRate * 10) / 10,
      
      // Email metrics
      emailsSent,
      emailDeliveryRate: emailsSent > 0 ? Math.round((emailsDelivered / emailsSent * 100) * 10) / 10 : 0,
      emailOpenRate: emailsDelivered > 0 ? Math.round((emailsOpened / emailsDelivered * 100) * 10) / 10 : 0,
      emailClickRate: emailsOpened > 0 ? Math.round((emailsClicked / emailsOpened * 100) * 10) / 10 : 0,
      emailFailureRate: emailsSent > 0 ? Math.round((emailsFailed / emailsSent * 100) * 10) / 10 : 0,
      
      // Performance indicators
      pendingTransactions: allTransactions?.filter(t => t.status === 'held').length || 0,
      refundedTransactions: allTransactions?.filter(t => t.status === 'refunded').length || 0,
      refundRate: allTransactions?.length > 0 ? 
        Math.round((allTransactions.filter(t => t.status === 'refunded').length / allTransactions.length * 100) * 10) / 10 : 0,
      
      // Top performers
      topEarners,
      
      // Time period
      reportPeriod: '30 days',
      generatedAt: new Date().toISOString()
    }

    return new Response(
      JSON.stringify({ success: true, data: analytics }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Admin analytics error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('Access denied') ? 403 : 500,
      },
    )
  }
})