// Public webhook endpoint for Postmark inbound emails
// This function has no authentication to accept Postmark's webhook calls
// It forwards to the main webhook logic

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Allow all origins and methods
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    console.log('=== PUBLIC WEBHOOK: Request from Postmark ===')

    // Get the request body
    const body = await req.text()
    console.log('Body length:', body.length)

    // Forward to the authenticated webhook endpoint with service role key
    console.log('Forwarding to postmark-inbound-webhook...')

    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/postmark-inbound-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: body,
      }
    )

    const result = await response.json()
    console.log('Inbound webhook response status:', response.status)
    console.log('Inbound webhook result:', JSON.stringify(result).substring(0, 200))

    // CRITICAL: Always return 200 to Postmark, regardless of internal status
    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,  // ← ALWAYS 200, never forward internal errors
      }
    )

  } catch (error: any) {
    console.error('❌ Public webhook error:', error.message)

    // Return 200 even on error so Postmark doesn't retry
    return new Response(
      JSON.stringify({
        received: true,
        processed: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  }
})
