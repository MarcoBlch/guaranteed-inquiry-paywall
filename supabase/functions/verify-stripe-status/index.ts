import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.6.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    console.log('Verifying Stripe status for user:', user.id)

    // Get user's Stripe account ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_completed')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile not found:', profileError)
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }

    if (!profile.stripe_account_id) {
      console.log('No Stripe account found for user')
      return new Response(
        JSON.stringify({
          onboarding_completed: false,
          message: 'No Stripe account created yet'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Fetch account from Stripe
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    console.log('Fetching Stripe account:', profile.stripe_account_id)
    const account = await stripe.accounts.retrieve(profile.stripe_account_id)

    console.log('Stripe account status:', {
      id: account.id,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled
    })

    // Check if onboarding is complete
    const isComplete = account.details_submitted && account.charges_enabled

    // Update profile if status changed
    if (isComplete && !profile.stripe_onboarding_completed) {
      console.log('Updating profile - onboarding completed!')

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_onboarding_completed: true })
        .eq('id', user.id)

      if (updateError) {
        console.error('Failed to update profile:', updateError)
      } else {
        console.log('Profile updated successfully')

        // Process any pending transfers
        await supabase.functions.invoke('process-pending-transfers', {
          body: { userId: user.id }
        })
      }
    }

    return new Response(
      JSON.stringify({
        onboarding_completed: isComplete,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error verifying Stripe status:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
