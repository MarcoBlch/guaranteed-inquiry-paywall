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
    const { messageId, responseReceived = true } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Marquer réponse reçue
    const { data: messageResponse, error: responseError } = await supabase
      .from('message_responses')
      .update({
        has_response: responseReceived,
        response_received_at: new Date().toISOString()
      })
      .eq('message_id', messageId)
      .select('escrow_transaction_id')
      .single()

    if (responseError || !messageResponse) {
      throw new Error('Message response not found')
    }

    // 2. Si réponse reçue, déclencher distribution
    if (responseReceived && messageResponse.escrow_transaction_id) {
      const { error: distributeError } = await supabase.functions.invoke('distribute-escrow-funds', {
        body: { escrowTransactionId: messageResponse.escrow_transaction_id }
      })

      if (distributeError) {
        console.error('Distribution error:', distributeError)
        // Continue - on peut retry plus tard
        return new Response(
          JSON.stringify({ 
            success: true, 
            warning: 'Response marked but distribution failed - will retry later' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error marking response:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})