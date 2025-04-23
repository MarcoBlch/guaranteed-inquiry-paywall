
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
    
    // Since we're in sandbox/development mode, create a mock order
    // This avoids needing real PayPal credentials during development
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
