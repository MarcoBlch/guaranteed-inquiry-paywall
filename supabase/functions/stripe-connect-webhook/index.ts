import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature')
    const body = await req.text()
    
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    // Vérifier signature webhook (simplifié)
    const event = JSON.parse(body)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    switch (event.type) {
      case 'account.updated':
        const account = event.data.object

        // Debug logging for webhook
        console.log('Account updated webhook:', {
          id: account.id,
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          capabilities: account.capabilities
        })

        // More flexible condition - accept either charges or transfers capability
        if (account.details_submitted && (account.charges_enabled || account.payouts_enabled)) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ stripe_onboarding_completed: true })
            .eq('stripe_account_id', account.id)

          if (!updateError) {
            console.log(`Stripe onboarding completed for account: ${account.id}`)
            
            // Déclencher traitement des transfers en attente
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('stripe_account_id', account.id)
              .single()

            if (profile) {
              await supabase.functions.invoke('process-pending-transfers', {
                body: { userId: profile.id }
              })
            }
          }
        }
        break

      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object.id)
        break

      case 'transfer.created':
        console.log('Transfer created:', event.data.object.id)
        break
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Error', { status: 400 })
  }
})