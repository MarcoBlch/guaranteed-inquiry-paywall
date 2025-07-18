import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Statistiques des dernières 24h
    const { data: stats } = await supabase
      .from('escrow_transactions')
      .select('status, amount')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const statusCounts = stats?.reduce((acc, t) => {
      acc[t.status] = {
        count: (acc[t.status]?.count || 0) + 1,
        amount: (acc[t.status]?.amount || 0) + t.amount
      }
      return acc
    }, {} as Record<string, { count: number; amount: number }>) || {}

    // Transactions qui approchent du timeout (dans 1h)
    const { data: nearTimeout } = await supabase
      .from('escrow_transactions')
      .select('id, expires_at, amount')
      .eq('status', 'held')
      .lt('expires_at', new Date(Date.now() + 60 * 60 * 1000).toISOString())

    // Fonds en attente de setup utilisateur
    const { data: pendingSetup } = await supabase
      .from('escrow_transactions')
      .select('amount')
      .eq('status', 'pending_user_setup')

    const totalPendingSetup = pendingSetup?.reduce((sum, t) => sum + t.amount, 0) || 0

    const health = {
      timestamp: new Date().toISOString(),
      last_24h_stats: statusCounts,
      transactions_near_timeout: nearTimeout?.length || 0,
      near_timeout_amount: nearTimeout?.reduce((sum, t) => sum + t.amount, 0) || 0,
      pending_user_setup_count: pendingSetup?.length || 0,
      pending_user_setup_amount: totalPendingSetup,
      status: 'healthy'
    }

    // Alertes
    if ((nearTimeout?.length || 0) > 10) {
      health.status = 'warning'
    }

    if (totalPendingSetup > 10000) { // Plus de 10k€ en attente
      health.status = 'warning'
    }

    return new Response(JSON.stringify(health, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ 
      status: 'error', 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})