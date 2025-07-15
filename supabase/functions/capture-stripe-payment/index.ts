import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { paymentIntentId } = await req.json()
    
    if (!paymentIntentId) {
      throw new Error('Payment Intent ID is required')
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured')
    }

    console.log(`Capturing payment for PaymentIntent: ${paymentIntentId}`)

    // Capture the payment
    const captureResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    })

    if (!captureResponse.ok) {
      const error = await captureResponse.text()
      console.error('Stripe capture error:', error)
      throw new Error(`Failed to capture payment: ${error}`)
    }

    const capturedPayment = await captureResponse.json()
    console.log('Payment captured successfully:', capturedPayment.id)

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: capturedPayment.id,
        status: capturedPayment.status,
        amount: capturedPayment.amount
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error capturing Stripe payment:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})