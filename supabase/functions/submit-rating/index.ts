import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

// In-memory rate limiting (per isolate)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT
}

async function verifyHmacToken(token: string, transactionId: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Decode the base64 token back to bytes
    const signatureBytes = Uint8Array.from(atob(token), c => c.charCodeAt(0))

    return await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(transactionId)
    )
  } catch {
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     req.headers.get('cf-connecting-ip') || 'unknown'

    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { token, transactionId, rating, comment } = body

    // Validate required fields
    if (!token || !transactionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing token or transaction ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rating must be an integer between 1 and 5' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (comment && (typeof comment !== 'string' || comment.length > 500)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Comment must be 500 characters or fewer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify HMAC token
    const ratingSecret = Deno.env.get('RATING_SECRET')
    if (!ratingSecret) {
      console.error('RATING_SECRET environment variable not set')
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isValid = await verifyHmacToken(token, transactionId, ratingSecret)
    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired rating link' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Connect to Supabase with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch the transaction
    const { data: transaction, error: txError } = await supabase
      .from('escrow_transactions')
      .select('id, status, message_id, sender_email')
      .eq('id', transactionId)
      .single()

    if (txError || !transaction) {
      return new Response(
        JSON.stringify({ success: false, error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (transaction.status !== 'released') {
      return new Response(
        JSON.stringify({ success: false, error: 'Ratings can only be submitted for completed transactions' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for existing rating
    const { data: existingRating } = await supabase
      .from('message_ratings')
      .select('id')
      .eq('transaction_id', transactionId)
      .maybeSingle()

    if (existingRating) {
      return new Response(
        JSON.stringify({ success: false, error: 'You have already rated this response' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hash the token for storage (don't store the raw HMAC signature)
    const encoder = new TextEncoder()
    const tokenHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token))
    const tokenHash = Array.from(new Uint8Array(tokenHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Insert the rating (trigger will auto-update profiles.avg_rating + total_ratings)
    const { error: insertError } = await supabase
      .from('message_ratings')
      .insert({
        transaction_id: transactionId,
        message_id: transaction.message_id,
        rating,
        comment: comment?.trim() || null,
        rating_token_hash: tokenHash,
        sender_email: transaction.sender_email || null,
      })

    if (insertError) {
      console.error('Failed to insert rating:', insertError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save rating' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Also update legacy email_response_tracking.quality_score for backward compat
    try {
      await supabase
        .from('email_response_tracking')
        .update({ quality_score: rating })
        .eq('transaction_id', transactionId)
    } catch (legacyError) {
      // Non-blocking — legacy table update is best-effort
      console.warn('Failed to update legacy quality_score:', legacyError)
    }

    console.log(`Rating submitted: tx=${transactionId} rating=${rating}`)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Submit rating error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
