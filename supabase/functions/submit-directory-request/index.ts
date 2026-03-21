import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

// Rate limiting
interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS_PER_WINDOW = 30 // 30 submissions per hour per IP

setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(ip)
    }
  }
}, 10 * 60 * 1000)

function checkRateLimit(clientIP: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(clientIP)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(clientIP, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true }
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  entry.count++
  return { allowed: true }
}

// Email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     req.headers.get('x-real-ip') || 'unknown'

    const rateLimitCheck = checkRateLimit(clientIP)
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': rateLimitCheck.retryAfter!.toString(),
          }
        }
      )
    }

    const body = await req.json()
    const { targetSlug, name, email } = body

    // Validate inputs
    if (!targetSlug || typeof targetSlug !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Target is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
      return new Response(
        JSON.stringify({ success: false, error: 'Full name is required (max 100 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!email || !EMAIL_REGEX.test(email.toLowerCase().trim())) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please enter a valid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const sanitizedName = name.trim().substring(0, 100)
    const sanitizedEmail = email.toLowerCase().trim()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find the directory entry by slug
    const { data: entry, error: findError } = await supabase
      .from('directory_requests')
      .select('id, target_name, status')
      .eq('target_slug', targetSlug)
      .eq('status', 'active')
      .maybeSingle()

    if (findError) {
      console.error('Database error:', findError)
      throw new Error('Failed to process request')
    }

    if (!entry) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Try to insert the request email (unique constraint will prevent duplicates)
    const { error: insertError } = await supabase
      .from('directory_request_emails')
      .insert({
        directory_request_id: entry.id,
        requester_name: sanitizedName,
        email: sanitizedEmail,
      })

    if (insertError) {
      // Unique constraint violation = already requested
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({
            success: true,
            alreadyRequested: true,
            message: `You've already requested access for ${entry.target_name}. We'll notify you when they join!`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.error('Insert error:', insertError)
      throw new Error('Failed to submit request')
    }

    // Increment request_count by counting actual emails (accurate, no race condition)
    const { count: emailCount } = await supabase
      .from('directory_request_emails')
      .select('id', { count: 'exact', head: true })
      .eq('directory_request_id', entry.id)

    await supabase
      .from('directory_requests')
      .update({ request_count: emailCount || 1 })
      .eq('id', entry.id)

    console.log(`✅ New request for ${entry.target_name} from ${sanitizedEmail}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Thanks! We'll notify you when ${entry.target_name} joins FastPass.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error submitting directory request:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Failed to submit request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
