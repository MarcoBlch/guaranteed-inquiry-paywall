
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// SECURITY FIX: Restrict CORS to specific domains in production
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ENVIRONMENT') === 'production' 
    ? 'https://your-domain.com' 
    : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json()
    const { paymentIntentId, messageData } = requestBody
    
    // SECURITY FIX: Comprehensive input validation
    if (!paymentIntentId || typeof paymentIntentId !== 'string' || !paymentIntentId.startsWith('pi_')) {
      throw new Error('Invalid payment intent ID')
    }
    
    if (!messageData || typeof messageData !== 'object') {
      throw new Error('Invalid message data')
    }
    
    // Validate required fields
    const requiredFields = ['userId', 'senderEmail', 'content', 'price', 'responseDeadlineHours']
    for (const field of requiredFields) {
      if (!messageData[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(messageData.senderEmail)) {
      throw new Error('Invalid sender email format')
    }
    
    // Validate price and deadline
    if (typeof messageData.price !== 'number' || messageData.price <= 0 || messageData.price > 100000) {
      throw new Error('Invalid price amount')
    }
    
    if (typeof messageData.responseDeadlineHours !== 'number' || 
        messageData.responseDeadlineHours < 1 || 
        messageData.responseDeadlineHours > 168) {
      throw new Error('Invalid response deadline (must be 1-168 hours)')
    }
    
    // Validate content length
    if (typeof messageData.content !== 'string' || 
        messageData.content.length < 10 || 
        messageData.content.length > 10000) {
      throw new Error('Invalid message content length')
    }
    
    // Sanitize content to prevent XSS
    const sanitizedContent = messageData.content
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .trim()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Insert message with sanitized content
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: messageData.userId,
        sender_email: messageData.senderEmail,
        content: sanitizedContent,
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
        status: 'held', // Fonds en escrow
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

    // Get recipient email address from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', messageData.userId)
      .single()

    if (profileError || !profile?.email) {
      throw new Error('Recipient profile or email not found')
    }

    // Format response deadline
    const responseDeadline = messageData.responseDeadlineHours === 24 ? '24 hours' :
                             messageData.responseDeadlineHours === 48 ? '48 hours' :
                             messageData.responseDeadlineHours === 72 ? '72 hours' :
                             `${messageData.responseDeadlineHours} hours`

    // Send email to recipient using our new email system
    await supabase.functions.invoke('send-message-email', {
      body: {
        senderEmail: messageData.senderEmail,
        senderMessage: sanitizedContent,
        responseDeadline: responseDeadline,
        paymentAmount: messageData.price,
        messageId: message.id,
        recipientEmail: profile.email
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

  } catch (error: any) {
    console.error('Error processing escrow payment:', error)
    
    // SECURITY FIX: Sanitize error messages to prevent information leakage
    let errorMessage = 'Une erreur interne s\'est produite'
    if (error.message?.includes('Invalid') || error.message?.includes('Missing')) {
      errorMessage = error.message // Safe validation errors
    } else if (error.message?.includes('duplicate key')) {
      errorMessage = 'Cette transaction existe déjà'
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message?.includes('Invalid') || error.message?.includes('Missing') ? 400 : 500
      }
    )
  }
})
