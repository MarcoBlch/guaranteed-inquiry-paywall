import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    
    console.log(`Creating PayPal order for price: ${price}`);
    
    // Get PayPal credentials from environment
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_SECRET_KEY');
    
    // If we have real PayPal credentials, use the actual PayPal API
    if (clientId && clientSecret && clientId !== 'sb') {
      console.log('Using real PayPal API');
      
      try {
        // Get access token from PayPal
        const tokenResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
          },
          body: 'grant_type=client_credentials'
        });
        
        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          console.error('PayPal token error:', errorData);
          throw new Error('Failed to authenticate with PayPal');
        }
        
        const { access_token } = await tokenResponse.json();
        
        // Create order with PayPal
        const orderResponse = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
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
        
        if (!orderResponse.ok) {
          const errorData = await orderResponse.json();
          console.error('PayPal order error:', errorData);
          throw new Error('Failed to create PayPal order');
        }
        
        const order = await orderResponse.json();
        
        return new Response(
          JSON.stringify(order),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      } catch (paypalError) {
        console.error('PayPal API error:', paypalError);
        throw new Error(`PayPal API error: ${paypalError.message}`);
      }
    } else {
      // Otherwise, create a mock order
      console.log('Using mock PayPal order (sandbox mode)');
      const mockOrderId = `MOCK_${Date.now()}`;
      
      return new Response(
        JSON.stringify({
          id: mockOrderId,
          status: 'CREATED',
          links: [
            {
              href: `https://www.sandbox.paypal.com/checkoutnow?token=${mockOrderId}`,
              rel: 'approve',
              method: 'GET'
            }
          ]
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
  } catch (error) {
    console.error("PayPal integration error:", error);
    
    // Return a more detailed error response
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create PayPal order',
        details: error.stack || 'No stack trace available'
      }),
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
