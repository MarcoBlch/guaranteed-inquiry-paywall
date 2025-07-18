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
    const { escrowTransactionId } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Récupérer transaction avec profile
    const { data: transaction, error: transactionError } = await supabase
      .from('escrow_transactions')
      .select(`
        *,
        profiles!escrow_transactions_recipient_user_id_fkey(
          stripe_account_id,
          stripe_onboarding_completed
        )
      `)
      .eq('id', escrowTransactionId)
      .single()

    if (transactionError || !transaction) {
      throw new Error('Transaction not found')
    }

    if (transaction.status !== 'held') {
      throw new Error(`Transaction status is ${transaction.status}, expected 'held'`)
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const totalAmountCents = Math.round(transaction.amount * 100)

    // 2. Calculer distribution 75/25
    const userAmountCents = Math.round(totalAmountCents * 0.75)    // 75%
    const platformFeeCents = Math.round(totalAmountCents * 0.25)   // 25%

    console.log(`Distributing ${totalAmountCents} cents:`, {
      user: userAmountCents,        // 75%
      platform: platformFeeCents    // 25% (reste automatiquement)
    })

    // 3. Capturer le paiement (argent arrive sur notre compte principal)
    const captureResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${transaction.stripe_payment_intent_id}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    })

    if (!captureResponse.ok) {
      const error = await captureResponse.text()
      throw new Error(`Failed to capture payment: ${error}`)
    }

    const capturedPayment = await captureResponse.json()
    console.log('Payment captured:', capturedPayment.id)

    // 4. Transfer vers utilisateur SI Stripe Connect configuré
    let userTransfer = null
    if (transaction.profiles.stripe_account_id && transaction.profiles.stripe_onboarding_completed) {
      const userTransferResponse = await fetch('https://api.stripe.com/v1/transfers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: userAmountCents.toString(),
          currency: 'eur',
          destination: transaction.profiles.stripe_account_id,
          description: `FastPass response payment - ${transaction.message_id}`,
          'metadata[transaction_id]': escrowTransactionId,
          'metadata[type]': 'user_payout'
        })
      })

      if (userTransferResponse.ok) {
        userTransfer = await userTransferResponse.json()
        console.log('User transfer created:', userTransfer.id)
        
        // 5a. Mettre à jour statut = released
        await supabase
          .from('escrow_transactions')
          .update({ 
            status: 'released',
            updated_at: new Date().toISOString()
          })
          .eq('id', escrowTransactionId)
      } else {
        const error = await userTransferResponse.text()
        console.error('User transfer failed:', error)
        throw new Error(`Transfer failed: ${error}`)
      }
    } else {
      // 5b. Utilisateur n'a pas configuré Stripe - fonds en attente
      console.log('User has not completed Stripe setup - funds held until setup complete')
      
      await supabase
        .from('escrow_transactions')
        .update({ 
          status: 'pending_user_setup',
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowTransactionId)
        
      return new Response(
        JSON.stringify({
          success: true,
          captured_amount: capturedPayment.amount,
          status: 'pending_user_setup',
          message: 'Funds held until user completes Stripe setup',
          platform_fee: platformFeeCents
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. PAS DE TRANSFER CHARITY - les 25% restent automatiquement

    return new Response(
      JSON.stringify({
        success: true,
        captured_amount: capturedPayment.amount,
        user_transfer_id: userTransfer?.id,
        platform_fee: platformFeeCents,
        status: 'released'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error distributing funds:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})