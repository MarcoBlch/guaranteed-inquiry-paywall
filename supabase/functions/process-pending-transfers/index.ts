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
    const { userId } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Trouver toutes les transactions en attente pour cet utilisateur
    const { data: pendingTransactions, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('recipient_user_id', userId)
      .eq('status', 'pending_user_setup')

    if (error) throw error

    console.log(`Processing ${pendingTransactions.length} pending transfers for user ${userId}`)

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
        total_pending: pendingTransactions.length,
        processed: processedCount,
        errors: errorCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing pending transfers:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})