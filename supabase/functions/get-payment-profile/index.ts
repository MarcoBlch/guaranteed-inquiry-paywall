import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

// 🔒 RATE LIMITING: Prevent profile scraping and abuse
// Track requests per IP address with timestamps
interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds
const MAX_REQUESTS_PER_WINDOW = 60 // 60 requests per hour per IP

// Clean up expired entries every 10 minutes to prevent memory leaks
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

  if (!entry) {
    // First request from this IP
    rateLimitStore.set(clientIP, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW
    })
    return { allowed: true }
  }

  // Check if window has expired
  if (now > entry.resetAt) {
    // Reset the counter
    rateLimitStore.set(clientIP, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW
    })
    return { allowed: true }
  }

  // Check if limit exceeded
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000) // seconds
    return { allowed: false, retryAfter }
  }

  // Increment counter
  entry.count++
  rateLimitStore.set(clientIP, entry)
  return { allowed: true }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Extract client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     req.headers.get('x-real-ip') ||
                     'unknown'

    console.log('Request from IP:', clientIP)

    // Check rate limit
    const rateLimitCheck = checkRateLimit(clientIP)
    if (!rateLimitCheck.allowed) {
      console.warn(`⚠️ Rate limit exceeded for IP: ${clientIP}`)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many requests. Please try again later.',
          retryAfter: rateLimitCheck.retryAfter
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': rateLimitCheck.retryAfter!.toString(),
            'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + (rateLimitCheck.retryAfter! * 1000)).toISOString()
          }
        }
      )
    }

    console.log('Getting payment profile information');

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate userId format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new Error('Invalid user ID format');
    }

    // Create Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseServiceKey) {
      throw new Error('Service role key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching profile for userId:', userId);

    // Query profile with service role permissions
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('price, stripe_onboarding_completed, stripe_account_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to fetch profile information');
    }

    if (!profile) {
      throw new Error('Profile not found');
    }

    console.log('Profile found:', {
      hasPrice: !!profile.price,
      stripeOnboardingCompleted: profile.stripe_onboarding_completed,
      hasStripeAccount: !!profile.stripe_account_id
    });

    // Validate profile is ready for payments
    if (!profile.price) {
      throw new Error('This user has not set their pricing yet');
    }

    if (!profile.stripe_onboarding_completed) {
      throw new Error('This user has not completed Stripe Connect setup yet');
    }

    // Return only the necessary information for payment
    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          price: profile.price,
          stripeOnboardingCompleted: profile.stripe_onboarding_completed,
          userName: 'this user' // Generic name to maintain privacy
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error fetching payment profile:', error);

    let errorMessage = 'Failed to load payment details';
    let statusCode = 500;

    if (error.message?.includes('required') ||
        error.message?.includes('Invalid') ||
        error.message?.includes('not found') ||
        error.message?.includes('not set') ||
        error.message?.includes('not completed')) {
      errorMessage = error.message;
      statusCode = 400;
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode
      }
    );
  }
})