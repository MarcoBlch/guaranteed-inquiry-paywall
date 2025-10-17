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
    // Make userId optional - if not provided, process ALL pending transfers
    const body = await req.json().catch(() => ({}))
    const { userId } = body

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Build query - filter by userId only if provided
    let query = supabase
      .from('escrow_transactions')
      .select('*')
      .eq('status', 'pending_user_setup')

    if (userId) {
      query = query.eq('recipient_user_id', userId)
      console.log(`Processing pending transfers for user ${userId}`)
    } else {
      console.log('Processing ALL pending transfers (no userId specified)')
    }

    const { data: pendingTransactions, error } = await query

    if (error) throw error

    console.log(`Found ${pendingTransactions.length} pending transfers to process`)

    let processedCount = 0
    let errorCount = 0

    for (const transaction of pendingTransactions) {
      try {
        // Déclencher distribution maintenant que Stripe est configuré
        const { error: distributeError } = await supabase.functions.invoke('distribute-escrow-funds', {
          body: { escrowTransactionId: transaction.id }
        })

        if (distributeError) {
          console.error(`Failed to process transaction ${transaction.id}:`, distributeError)
          errorCount++
        } else {
          console.log(`Successfully processed transaction ${transaction.id}`)
          processedCount++
        }
      } catch (error) {
        console.error(`Error processing transaction ${transaction.id}:`, error)
        errorCount++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId || 'all',
        total_pending: pendingTransactions.length,
        processed: processedCount,
        errors: errorCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing pending transfers:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})