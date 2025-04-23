
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
    // Get the PayPal client ID from environment variables
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
    
    if (!clientId) {
      console.log('PayPal client ID not configured, using sandbox mode');
      
      // Return sandbox client ID (not an error)
      return new Response(
        JSON.stringify({
          clientId: 'sb',
          mode: 'sandbox'
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        clientId,
        mode: 'production'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error("Error retrieving PayPal client ID:", error);
    
    // Return a 200 response with an error flag instead of a 500 error
    return new Response(
      JSON.stringify({ 
        error: true,
        message: error.message || 'Failed to retrieve PayPal client ID',
        clientId: 'sb',
        mode: 'sandbox'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200, // Use 200 even for errors to avoid breaking the client
      },
    );
  }
})
