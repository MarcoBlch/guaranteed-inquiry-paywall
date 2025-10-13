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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Starting daily reconciliation...')

    // Get yesterday's date range
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    console.log(`Reconciling transactions from ${yesterday.toISOString()} to ${today.toISOString()}`)

    // Get all transactions from yesterday
    const { data: transactions, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())

    if (error) throw error

    // Calculate statistics
    const stats = {
      date: yesterday.toISOString().split('T')[0],
      total_transactions: transactions.length,
      total_amount: 0,
      held: { count: 0, amount: 0 },
      processing: { count: 0, amount: 0 },
      released: { count: 0, amount: 0 },
      refunded: { count: 0, amount: 0 },
      pending_user_setup: { count: 0, amount: 0 },
      transfer_failed: { count: 0, amount: 0 },
      payment_failed: { count: 0, amount: 0 }
    }

    for (const tx of transactions) {
      stats.total_amount += tx.amount

      const status = tx.status as keyof typeof stats
      if (stats[status] && typeof stats[status] === 'object') {
        (stats[status] as any).count++
        (stats[status] as any).amount += tx.amount
      }
    }

    console.log('📊 Reconciliation results:', stats)

    // Check for issues
    const issues = []

    if (stats.transfer_failed.count > 0) {
      issues.push(`⚠️ ${stats.transfer_failed.count} failed transfers totaling €${stats.transfer_failed.amount.toFixed(2)}`)
    }

    if (stats.processing.count > 0) {
      issues.push(`⚠️ ${stats.processing.count} transactions stuck in 'processing' status`)
    }

    if (stats.payment_failed.count > 0) {
      issues.push(`❌ ${stats.payment_failed.count} payment failures`)
    }

    // Check refund rate
    const refundRate = transactions.length > 0
      ? (stats.refunded.count / transactions.length) * 100
      : 0

    if (refundRate > 30) {
      issues.push(`🚨 High refund rate: ${refundRate.toFixed(1)}% (${stats.refunded.count}/${transactions.length})`)
    }

    // Log reconciliation
    await supabase.from('admin_actions').insert({
      action_type: 'daily_reconciliation',
      description: `Daily reconciliation for ${stats.date}: ${transactions.length} transactions, €${stats.total_amount.toFixed(2)} total`,
      metadata: {
        stats,
        issues,
        refund_rate: refundRate.toFixed(2)
      }
    })

    // If issues found, create alerts
    if (issues.length > 0) {
      console.error('🚨 Issues found:')
      issues.forEach(issue => console.error(`  - ${issue}`))

      // You could send email/Slack notification here
      // await sendAlertEmail(issues)
    } else {
      console.log('✅ No issues found')
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: stats.date,
        stats,
        issues,
        refund_rate: refundRate.toFixed(2) + '%'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in daily reconciliation:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
