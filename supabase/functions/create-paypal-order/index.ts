
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const PAYPAL_API = 'https://api-m.sandbox.paypal.com';

serve(async (req) => {
  try {
    const { price } = await req.json();
    
    // Get access token
    const auth = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${btoa(`${Deno.env.get('PAYPAL_CLIENT_ID')}:${Deno.env.get('PAYPAL_SECRET_KEY')}`)}`,
      },
      body: 'grant_type=client_credentials'
    });

    const { access_token } = await auth.json();

    // Create order
    const order = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: price.toString()
          }
        }]
      })
    });

    const data = await order.json();

    return new Response(
      JSON.stringify(data),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      },
    )
  }
})
