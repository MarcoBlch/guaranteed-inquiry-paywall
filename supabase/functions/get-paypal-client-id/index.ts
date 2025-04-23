
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
      console.error('PayPal client ID not configured');
      throw new Error('PayPal integration not fully configured');
    }
    
    return new Response(
      JSON.stringify({
        clientId,
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
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to retrieve PayPal client ID'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500,
      },
    );
  }
})
