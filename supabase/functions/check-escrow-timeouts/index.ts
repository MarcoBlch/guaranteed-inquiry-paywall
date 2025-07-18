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

    // Trouver toutes les transactions expirées (statut 'held' uniquement)
    const { data: expiredTransactions, error } = await supabase
      .from('escrow_transactions')
      .select(`
        *,
        message_responses!inner(has_response)
      `)
      .eq('status', 'held')
      .eq('message_responses.has_response', false)
      .lt('expires_at', new Date().toISOString())

    if (error) throw error

    console.log(`Found ${expiredTransactions.length} expired transactions`)

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    let refundedCount = 0
    let errorCount = 0

    for (const transaction of expiredTransactions) {
      try {
        // Cancel payment intent = automatic refund
        const cancelResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${transaction.stripe_payment_intent_id}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        })

        if (cancelResponse.ok) {
          await supabase
            .from('escrow_transactions')
            .update({ 
              status: 'refunded',
              updated_at: new Date().toISOString()
            })
            .eq('id', transaction.id)

          console.log(`Refunded expired transaction: ${transaction.id}`)
          refundedCount++
        } else {
          const error = await cancelResponse.text()
          console.error(`Failed to refund transaction ${transaction.id}:`, error)
          errorCount++
        }
      } catch (refundError) {
        console.error(`Error processing expired transaction ${transaction.id}:`, refundError)
        errorCount++
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        total_expired: expiredTransactions.length,
        refunded: refundedCount,
        errors: errorCount
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error checking escrow timeouts:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})