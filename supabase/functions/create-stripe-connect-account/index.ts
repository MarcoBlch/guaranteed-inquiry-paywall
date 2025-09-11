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

    // 4. Créer ou récupérer compte Stripe Connect
    console.log('💳 Creating Stripe Connect account...')
    
    let stripeAccountId = profile?.stripe_account_id

    if (!stripeAccountId) {
      // Récupérer l'email de l'utilisateur depuis Supabase
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) {
        console.error('❌ Failed to get user data:', userError)
        return new Response(
          JSON.stringify({ error: `Failed to get user data: ${userError.message}` }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }

      // Récupérer l'email depuis auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
      
      if (authError || !authUser.user?.email) {
        console.error('❌ Failed to get user email:', authError)
        return new Response(
          JSON.stringify({ error: 'Failed to get user email' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }

      console.log('✅ User email found:', authUser.user.email)

      // Créer nouveau compte Connect avec personnalisation FASTPASS
      const accountResponse = await fetch('https://api.stripe.com/v1/accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          type: 'express',
          country: 'FR',
          email: authUser.user.email,
          'business_type': 'individual',
          'business_profile[category]': 'professional_services',
          'business_profile[subcategory]': 'consulting',
          'business_profile[product_description]': 'Premium professional communication and response services through FASTPASS - guaranteed response platform for busy professionals',
          'business_profile[name]': 'FASTPASS Professional Services',
          'business_profile[url]': 'https://fastpass.email',
          'business_profile[support_phone]': '+33123456789',
          'business_profile[support_email]': 'support@fastpass.email',
          'business_profile[support_url]': 'https://fastpass.email/support',
          'settings[branding][primary_color]': '#ea580c', // Orange theme matching FASTPASS
          'settings[branding][secondary_color]': '#dc2626', // Red accent
          'settings[branding][icon]': 'https://fastpass.email/favicon.ico',
          'settings[branding][logo]': 'https://fastpass.email/logo.png',
          'settings[payouts][schedule][interval]': 'daily',
          'settings[payouts][statement_descriptor]': 'FASTPASS',
          'settings[dashboard][display_name]': 'FASTPASS Earnings Dashboard',
          'settings[dashboard][timezone]': 'Europe/Paris',
          'capabilities[card_payments][requested]': 'true',
          'capabilities[transfers][requested]': 'true',
        })
      })

      if (!accountResponse.ok) {
        const errorText = await accountResponse.text()
        console.error('❌ Account creation failed:', errorText)
        return new Response(
          JSON.stringify({ error: `Failed to create Stripe account: ${errorText}` }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }

      const account = await accountResponse.json()
      stripeAccountId = account.id
      console.log('✅ Created Stripe account:', stripeAccountId)

      // Sauvegarder l'ID dans Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', userId)

      if (updateError) {
        console.error('❌ Failed to save account ID:', updateError)
        return new Response(
          JSON.stringify({ error: `Failed to save account: ${updateError.message}` }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }
    }

    // 5. Créer lien d'onboarding
    const origin = req.headers.get('origin')
    const referer = req.headers.get('referer')
    
    // Determine base URL with production domain priority
    let baseUrl = 'https://fastpass.email' // Default to production
    
    if (origin) {
      baseUrl = origin
    } else if (referer) {
      try {
        baseUrl = new URL(referer).origin
      } catch (e) {
        console.log('Failed to parse referer URL:', referer)
      }
    } else if (process.env.NODE_ENV === 'development') {
      baseUrl = 'http://localhost:5173'
    }
    
    console.log('🌐 Base URL determined:', {
      origin,
      referer,
      finalBaseUrl: baseUrl,
      environment: process.env.NODE_ENV || 'production'
    })
    
    const onboardingResponse = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        account: stripeAccountId,
        refresh_url: `${baseUrl}/dashboard?setup=refresh`,
        return_url: `${baseUrl}/dashboard?setup=complete`,
        type: 'account_onboarding',
        'collect': 'eventually_due', // Collect only essential information upfront
      })
    })

    if (!onboardingResponse.ok) {
      const errorText = await onboardingResponse.text()
      console.error('❌ Onboarding link creation failed:', errorText)
      return new Response(
        JSON.stringify({ error: `Failed to create onboarding link: ${errorText}` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    const onboardingData = await onboardingResponse.json()
    console.log('✅ Created onboarding link')

    return new Response(
      JSON.stringify({ 
        onboarding_url: onboardingData.url,
        stripe_account_id: stripeAccountId
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