
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
      return new Response(
        JSON.stringify({ error: 'Request must be application/json' }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 200 // Use 200 even for validation errors
        }
      );
    }
    
    // Parse request body
    let payload;
    try {
      payload = await req.json();
      console.log('Received payload:', JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to parse request JSON:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 200 // Use 200 even for parsing errors
        }
      );
    }
    
    // Validate price parameter
    const { price } = payload;
    if (!price || typeof price !== 'number' || price <= 0) {
      console.error('Invalid price value:', price);
      return new Response(
        JSON.stringify({ error: 'Price must be a positive number' }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 200 // Use 200 even for validation errors
        }
      );
    }
    
    console.log(`Creating PayPal order for price: ${price}`);
    
    // Get PayPal credentials from environment
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_SECRET_KEY');
    
    console.log(`PayPal credentials check: ClientID exists: ${!!clientId}, SecretKey exists: ${!!clientSecret}`);
    console.log(`ClientID type: ${typeof clientId}, value length: ${clientId?.length}`);
    
    // Check if we have valid credentials (non-sandbox)
    if (!clientId || !clientSecret) {
      console.log('Missing PayPal credentials, using sandbox mode');
      const mockOrderId = `MOCK_MISSING_CREDS_${Date.now()}`;
      
      return new Response(
        JSON.stringify({
          orderID: mockOrderId,
          id: mockOrderId,
          status: 'CREATED',
          mode: 'sandbox_fallback',
          reason: 'missing_credentials',
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
    
    // Check if credentials appear to be sandbox
    if (clientId === 'sb' || clientId?.startsWith('sb-') || clientId?.includes('sandbox')) {
      console.log('Detected sandbox credentials, using sandbox mode');
      const mockOrderId = `MOCK_SANDBOX_CREDS_${Date.now()}`;
      
      return new Response(
        JSON.stringify({
          orderID: mockOrderId,
          id: mockOrderId,
          status: 'CREATED',
          mode: 'sandbox',
          reason: 'sandbox_credentials',
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
    
    // If we have real PayPal credentials, use the actual PayPal API
    console.log('Using live PayPal API');
    
    try {
      // Determine endpoint based on credentials
      const apiBase = clientId.includes('sandbox') 
        ? 'https://api-m.sandbox.paypal.com' 
        : 'https://api-m.paypal.com';
      
      console.log(`Using PayPal API base URL: ${apiBase}`);
      
      // Get access token from PayPal
      const tokenResponse = await fetch(`${apiBase}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
        },
        body: 'grant_type=client_credentials'
      });
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        console.error('PayPal token error:', JSON.stringify(tokenData));
        
        const mockErrorId = `MOCK_TOKEN_ERROR_${Date.now()}`;
        return new Response(
          JSON.stringify({
            orderID: mockErrorId,
            id: mockErrorId,
            status: 'CREATED',
            mode: 'sandbox_fallback',
            error: tokenData.error_description || 'Failed to get PayPal access token',
            errorDetails: tokenData,
            links: [
              {
                href: `https://www.sandbox.paypal.com/checkoutnow?token=MOCK_TOKEN_ERROR`,
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
      
      console.log('Successfully obtained PayPal access token');
      const { access_token } = tokenData;
      
      // Calculate commission (20%)
      const commissionRate = 0.20; // 20%
      const commission = price * commissionRate;
      const recipientAmount = price - commission;
      
      // Create order with PayPal using Payment Facilitator model
      const orderResponse = await fetch(`${apiBase}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            amount: {
              currency_code: "EUR", // Utiliser EUR selon votre setup
              value: price.toString(),
              breakdown: {
                item_total: {
                  currency_code: "EUR",
                  value: price.toString()
                }
              }
            },
            items: [{
              name: "Message Response Service",
              unit_amount: {
                currency_code: "EUR",
                value: price.toString()
              },
              quantity: "1"
            }],
            payment_instruction: {
              disbursement_mode: "INSTANT",
              platform_fees: [{
                amount: {
                  currency_code: "EUR",
                  value: commission.toFixed(2)
                }
              }]
            }
          }],
          application_context: {
            brand_name: "VotreService",
            landing_page: "BILLING",
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING"
          }
        })
      });
      
      const orderData = await orderResponse.json();
      
      if (!orderResponse.ok) {
        console.error('PayPal order creation error:', JSON.stringify(orderData));
        
        const mockErrorId = `MOCK_ORDER_ERROR_${Date.now()}`;
        return new Response(
          JSON.stringify({
            orderID: mockErrorId,
            id: mockErrorId,
            status: 'CREATED',
            mode: 'sandbox_fallback',
            error: orderData.message || 'Failed to create PayPal order',
            errorDetails: orderData,
            links: [
              {
                href: `https://www.sandbox.paypal.com/checkoutnow?token=MOCK_ORDER_ERROR`,
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
      
      console.log('Successfully created PayPal order:', orderData.id);
      
      return new Response(
        JSON.stringify({
          orderID: orderData.id,
          ...orderData
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    } catch (paypalError) {
      console.error('PayPal API error:', paypalError);
      
      // Fall back to sandbox mode on any error with detailed info
      const mockErrorId = `MOCK_API_ERROR_${Date.now()}`;
      return new Response(
        JSON.stringify({
          orderID: mockErrorId,
          id: mockErrorId,
          status: 'CREATED',
          mode: 'sandbox_fallback',
          error: paypalError.message || 'Unexpected error calling PayPal API',
          links: [
            {
              href: `https://www.sandbox.paypal.com/checkoutnow?token=MOCK_API_ERROR`,
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
    
    // Create a mock order even when there's an unexpected error
    const mockErrorId = `MOCK_ERROR_${Date.now()}`;
    return new Response(
      JSON.stringify({
        orderID: mockErrorId,
        id: mockErrorId,
        status: 'CREATED',
        mode: 'sandbox_fallback',
        error: error.message || 'Unexpected error',
        links: [
          {
            href: `https://www.sandbox.paypal.com/checkoutnow?token=${mockErrorId}`,
            rel: 'approve',
            method: 'GET'
          }
        ]
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200, // Always return 200 even for errors
      },
    );
  }
})
