
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// SECURITY FIX: Restrict CORS to specific domains in production
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ENVIRONMENT') === 'production'
    ? 'https://fastpass.email'
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
        status: 'held', // Funds in escrow
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

    // Get recipient email address from auth.users table
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(messageData.userId)

    if (userError || !user?.user?.email) {
      console.error('Failed to get user email:', userError)
      throw new Error('Recipient profile or email not found')
    }

    const recipientEmail = user.user.email

    // Format response deadline
    const responseDeadline = messageData.responseDeadlineHours === 24 ? '24 hours' :
                             messageData.responseDeadlineHours === 48 ? '48 hours' :
                             messageData.responseDeadlineHours === 72 ? '72 hours' :
                             `${messageData.responseDeadlineHours} hours`

    // Send email to recipient using Postmark email service
    console.log('Attempting to send email via postmark-send-message function')
    const emailResult = await supabase.functions.invoke('postmark-send-message', {
      body: {
        senderEmail: messageData.senderEmail,
        senderMessage: sanitizedContent,
        responseDeadline: responseDeadline,
        paymentAmount: messageData.price,
        messageId: message.id,
        recipientEmail: recipientEmail
      }
    })

    // Check if email sending failed
    if (emailResult.error) {
      console.error('Email sending failed:', emailResult.error)
      throw new Error(`Failed to send email notification: ${emailResult.error.message || 'Unknown error'}`)
    }

    // Verify email was actually sent
    const emailData = emailResult.data as any
    if (!emailData?.success) {
      console.error('Email function returned failure:', emailData)
      throw new Error(`Email sending returned failure: ${emailData?.error || 'Unknown error'}`)
    }

    console.log('Email sent successfully:', emailData?.emailId)

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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })

    // Enhanced error handling for debugging
    let errorMessage = 'An internal error occurred'
    let statusCode = 500

    if (error.message?.includes('Invalid') || error.message?.includes('Missing')) {
      errorMessage = error.message // Safe validation errors
      statusCode = 400
    } else if (error.message?.includes('duplicate key')) {
      errorMessage = 'This transaction already exists'
      statusCode = 409
    } else if (error.message?.includes('not found') || error.message?.includes('profile')) {
      errorMessage = 'User profile not found'
      statusCode = 404
    } else {
      // For debugging: include more error details in development
      errorMessage = `Internal error: ${error.message || 'Unknown error'}`
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error.message // Temporary for debugging
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode
      }
    )
  }
})
