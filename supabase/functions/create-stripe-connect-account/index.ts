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

  console.log('🟢 Function started')

  try {
    // 1. Vérifier la requête
    const body = await req.text()
    console.log('📥 Request body:', body)
    
    let requestData
    try {
      requestData = JSON.parse(body)
    } catch (e) {
      console.error('❌ JSON parse error:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    const { userId } = requestData
    console.log('👤 User ID:', userId)

    if (!userId) {
      console.error('❌ Missing userId')
      return new Response(
        JSON.stringify({ error: 'Missing userId parameter' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // 2. Vérifier les variables d'environnement
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('🔑 Environment check:', {
      hasStripeKey: !!stripeSecretKey,
      stripeKeyPrefix: stripeSecretKey?.substring(0, 10),
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseServiceKey
    })

    if (!stripeSecretKey) {
      console.error('❌ Missing STRIPE_SECRET_KEY')
      return new Response(
        JSON.stringify({ error: 'Stripe secret key not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // 3. Test connexion Supabase
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)
    
    console.log('🗃️ Testing Supabase connection...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('❌ Supabase error:', profileError)
      return new Response(
        JSON.stringify({ error: `Database error: ${profileError.message}` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    console.log('✅ Profile found:', { userId, hasExistingAccount: !!profile?.stripe_account_id })

    // 4. Test API Stripe - Version simplifiée
    console.log('💳 Testing Stripe API...')
    
    const testResponse = await fetch('https://api.stripe.com/v1/accounts?limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
      }
    })

    if (!testResponse.ok) {
      const errorText = await testResponse.text()
      console.error('❌ Stripe API test failed:', errorText)
      return new Response(
        JSON.stringify({ error: `Stripe API error: ${errorText}` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    console.log('✅ Stripe API connection successful')

    // 5. Pour le moment, retourner un mock URL
    const baseUrl = req.headers.get('origin') || 'http://localhost:5173'
    const mockUrl = `${baseUrl}/dashboard?setup=mock-success`

    console.log('🎯 Returning mock onboarding URL')

    return new Response(
      JSON.stringify({ 
        onboarding_url: mockUrl,
        debug: 'This is a debug version - real Stripe Connect creation disabled'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})