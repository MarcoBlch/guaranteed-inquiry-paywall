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
const MAX_REQUESTS_PER_WINDOW = 120 // 120 requests per hour per IP

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

    const url = new URL(req.url)
    const category = url.searchParams.get('category') || null
    const search = url.searchParams.get('search') || null
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '12', 10)))
    const offset = (page - 1) * limit

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Build query — only active entries
    let query = supabase
      .from('directory_requests')
      .select('id, target_name, target_slug, target_description, target_avatar_url, target_category, request_count, created_at', { count: 'exact' })
      .eq('status', 'active')
      .order('request_count', { ascending: false })
      .range(offset, offset + limit - 1)

    // Category filter
    if (category) {
      query = query.eq('target_category', category)
    }

    // Search filter (name or description)
    if (search) {
      query = query.or(`target_name.ilike.%${search}%,target_description.ilike.%${search}%`)
    }

    const { data: profiles, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      throw new Error('Failed to fetch directory profiles')
    }

    const total = count || 0
    const hasMore = offset + limit < total

    return new Response(
      JSON.stringify({
        success: true,
        profiles: profiles || [],
        total,
        page,
        hasMore,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Error fetching directory profiles:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Failed to load directory' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
