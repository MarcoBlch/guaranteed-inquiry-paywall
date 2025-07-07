
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
    const { price, responseDeadlineHours, userId } = await req.json()
    
    if (!price || !responseDeadlineHours || !userId) {
      throw new Error('Missing required parameters')
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured')
    }

    // Create Stripe payment intent with escrow hold
    const paymentIntentResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: Math.round(price * 100).toString(), // Convert to cents
        currency: 'eur',
        capture_method: 'manual', // Hold funds without capturing
        metadata: JSON.stringify({
          responseDeadlineHours: responseDeadlineHours.toString(),
          recipientUserId: userId,
          escrowType: 'guaranteed_response'
        })
      }),
    })

    if (!paymentIntentResponse.ok) {
      const error = await paymentIntentResponse.text()
      throw new Error(`Stripe API error: ${error}`)
    }

    const paymentIntent = await paymentIntentResponse.json()

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: 'created'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error creating Stripe payment:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
