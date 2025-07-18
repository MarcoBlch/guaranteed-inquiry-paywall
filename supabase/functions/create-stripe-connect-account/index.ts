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

  try {
    const { userId } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Vérifier si compte existe déjà
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const baseUrl = req.headers.get('origin') || 'http://localhost:5173'

    let accountId = profile?.stripe_account_id

    // Créer compte si nécessaire
    if (!accountId) {
      const accountResponse = await fetch('https://api.stripe.com/v1/accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          type: 'express',
          country: 'FR',
          'capabilities[transfers][requested]': 'true',
          'capabilities[card_payments][requested]': 'true'
        })
      })

      const account = await accountResponse.json()
      if (!accountResponse.ok) throw new Error(account.error?.message)
      
      accountId = account.id

      // Sauvegarder en base
      await supabase
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', userId)
    }

    // Créer onboarding link
    const linkResponse = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        account: accountId,
        refresh_url: `${baseUrl}/dashboard?setup=stripe&refresh=true`,
        return_url: `${baseUrl}/dashboard?setup=complete`,
        type: 'account_onboarding'
      })
    })

    const link = await linkResponse.json()
    if (!linkResponse.ok) throw new Error(link.error?.message)

    return new Response(
      JSON.stringify({ onboarding_url: link.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating Stripe Connect account:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})