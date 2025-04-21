
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const PAYPAL_API = 'https://api-m.sandbox.paypal.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting create-paypal-order function');
    
    // Validate request content type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Invalid content type:', contentType);
      throw new Error('Request must be application/json');
    }
    
    // Parse request body
    let payload;
    try {
      payload = await req.json();
      console.log('Received payload:', JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to parse request JSON:', e);
      throw new Error('Invalid JSON in request body');
    }
    
    // Validate price parameter
    const { price } = payload;
    if (!price || typeof price !== 'number' || price <= 0) {
      console.error('Invalid price value:', price);
      throw new Error('Price must be a positive number');
    }
    
    console.log(`Attempting to create PayPal order for price: ${price}`);
    
    // Check for PayPal credentials
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const secretKey = Deno.env.get('PAYPAL_SECRET_KEY');
    
    if (!clientId || !secretKey) {
      console.error('Missing PayPal credentials');
      throw new Error('PayPal credentials not configured');
    }
    
    // Get access token
    console.log('Requesting PayPal access token');
    const auth = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${btoa(`${clientId}:${secretKey}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!auth.ok) {
      const errorData = await auth.json();
      console.error("PayPal auth error:", errorData);
      throw new Error(`PayPal authentication failed: ${errorData.error_description || 'Unknown error'}`);
    }

    const { access_token } = await auth.json();
    console.log('Received access token from PayPal');

    // Create order
    console.log('Creating PayPal order');
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

    if (!order.ok) {
      const errorData = await order.json();
      console.error("PayPal order creation error:", errorData);
      throw new Error(`PayPal order creation failed: ${errorData.message || 'Unknown error'}`);
    }

    const data = await order.json();
    console.log("PayPal order created successfully:", data.id);

    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      },
    )
  } catch (error) {
    console.error("PayPal integration error:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create PayPal order' }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500,
      },
    )
  }
})
