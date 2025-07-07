
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
    const { paymentIntentId, messageData } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Insert message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: messageData.userId,
        sender_email: messageData.senderEmail,
        content: messageData.content,
        attachments: messageData.attachments || [],
        amount_paid: messageData.price,
        response_deadline_hours: messageData.responseDeadlineHours
      })
      .select()
      .single()

    if (messageError) throw messageError

    // Calculate expiration time
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + messageData.responseDeadlineHours)

    // Create escrow transaction
    const { data: escrowTransaction, error: escrowError } = await supabase
      .from('escrow_transactions')
      .insert({
        message_id: message.id,
        stripe_payment_intent_id: paymentIntentId,
        amount: messageData.price,
        status: 'held',
        recipient_user_id: messageData.userId,
        sender_email: messageData.senderEmail,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (escrowError) throw escrowError

    // Create message response tracking
    const { error: responseError } = await supabase
      .from('message_responses')
      .insert({
        message_id: message.id,
        escrow_transaction_id: escrowTransaction.id,
        has_response: false
      })

    if (responseError) throw responseError

    // Send email notification to recipient
    await supabase.functions.invoke('send-email-notification', {
      body: {
        recipientUserId: messageData.userId,
        senderEmail: messageData.senderEmail,
        content: messageData.content,
        responseDeadlineHours: messageData.responseDeadlineHours,
        amount: messageData.price,
        messageId: message.id
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: message.id,
        escrowId: escrowTransaction.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing escrow payment:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
