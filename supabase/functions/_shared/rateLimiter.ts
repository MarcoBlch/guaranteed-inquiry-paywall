/**
 * Rate Limiting Utility for Edge Functions
 *
 * Provides IP-based and user-based rate limiting with configurable limits.
 * Uses Supabase to store rate limit data with automatic expiration.
 *
 * Features:
 * - Configurable time windows and max attempts
 * - IP-based and user-based limiting
 * - Automatic cleanup of expired records
 * - Testing bypass via environment variable
 * - Returns proper HTTP 429 with Retry-After header
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface RateLimitConfig {
  /**
   * Unique identifier for this rate limit (e.g., 'login', 'password_reset')
   */
  key: string

  /**
   * Maximum number of attempts allowed within the time window
   */
  maxAttempts: number

  /**
   * Time window in seconds (e.g., 900 = 15 minutes)
   */
  windowSeconds: number

  /**
   * Optional identifier (email, user ID) for user-based limiting
   * If not provided, only IP-based limiting is used
   */
  identifier?: string

  /**
   * IP address for IP-based limiting
   */
  ipAddress: string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number // seconds until next attempt allowed
}

/**
 * Check if a request should be rate limited
 *
 * @param supabase - Supabase admin client (service role)
 * @param config - Rate limit configuration
 * @returns Rate limit result indicating if request is allowed
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Bypass rate limiting in test mode
  if (Deno.env.get('BYPASS_RATE_LIMIT') === 'true') {
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: new Date(Date.now() + config.windowSeconds * 1000)
    }
  }

  const now = new Date()
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000)

  // Create a composite key for IP + identifier (if provided)
  const limitKey = config.identifier
    ? `${config.key}:${config.ipAddress}:${config.identifier}`
    : `${config.key}:${config.ipAddress}`

  try {
    // 1. Clean up expired rate limit records (older than window)
    await supabase
      .from('rate_limits')
      .delete()
      .lt('created_at', windowStart.toISOString())

    // 2. Count attempts within the current time window
    const { data: attempts, error: countError } = await supabase
      .from('rate_limits')
      .select('id, created_at')
      .eq('limit_key', limitKey)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })

    if (countError) {
      console.error('Rate limit count error:', countError)
      // Fail open - allow request if we can't check rate limit
      return {
        allowed: true,
        remaining: config.maxAttempts,
        resetAt: new Date(now.getTime() + config.windowSeconds * 1000)
      }
    }

    const attemptCount = attempts?.length || 0

    // 3. Calculate reset time (based on oldest attempt in window)
    const oldestAttempt = attempts?.[attempts.length - 1]
    const resetAt = oldestAttempt
      ? new Date(new Date(oldestAttempt.created_at).getTime() + config.windowSeconds * 1000)
      : new Date(now.getTime() + config.windowSeconds * 1000)

    // 4. Check if limit exceeded
    if (attemptCount >= config.maxAttempts) {
      const retryAfter = Math.ceil((resetAt.getTime() - now.getTime()) / 1000)
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.max(1, retryAfter) // At least 1 second
      }
    }

    // 5. Record this attempt
    const { error: insertError } = await supabase
      .from('rate_limits')
      .insert({
        limit_key: limitKey,
        limit_type: config.key,
        ip_address: config.ipAddress,
        identifier: config.identifier || null,
        created_at: now.toISOString()
      })

    if (insertError) {
      console.error('Rate limit insert error:', insertError)
      // Fail open - allow request if we can't record attempt
    }

    return {
      allowed: true,
      remaining: config.maxAttempts - attemptCount - 1,
      resetAt
    }

  } catch (error) {
    console.error('Rate limit check error:', error)
    // Fail open - allow request on error to prevent service disruption
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: new Date(now.getTime() + config.windowSeconds * 1000)
    }
  }
}

/**
 * Create a rate limit error response (HTTP 429)
 *
 * @param result - Rate limit result from checkRateLimit
 * @param message - Optional custom error message
 * @returns Response object with proper headers
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  message?: string
): Response {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  const defaultMessage = result.retryAfter && result.retryAfter > 60
    ? `Too many requests. Please try again in ${Math.ceil(result.retryAfter / 60)} minutes.`
    : `Too many requests. Please try again in ${result.retryAfter || 60} seconds.`

  return new Response(
    JSON.stringify({
      error: message || defaultMessage,
      retryAfter: result.retryAfter,
      resetAt: result.resetAt.toISOString()
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter || 60),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': result.resetAt.toISOString()
      }
    }
  )
}

/**
 * Extract IP address from request
 *
 * @param req - Request object
 * @returns IP address (or 'unknown' if not found)
 */
export function getClientIP(req: Request): string {
  // Try various headers in order of preference
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
  ]

  for (const header of headers) {
    const value = req.headers.get(header)
    if (value) {
      // x-forwarded-for can be a comma-separated list, take the first one
      return value.split(',')[0].trim()
    }
  }

  return 'unknown'
}

/**
 * Preset rate limit configurations for common use cases
 */
export const RATE_LIMIT_PRESETS = {
  // 5 attempts per 15 minutes per IP
  LOGIN: {
    maxAttempts: 5,
    windowSeconds: 900 // 15 minutes
  },

  // 3 attempts per hour per email
  PASSWORD_RESET: {
    maxAttempts: 3,
    windowSeconds: 3600 // 1 hour
  },

  // 3 attempts per hour per user
  EMAIL_CHANGE: {
    maxAttempts: 3,
    windowSeconds: 3600 // 1 hour
  },

  // 1 attempt per hour per user (with confirmation required)
  ACCOUNT_DELETION: {
    maxAttempts: 1,
    windowSeconds: 3600 // 1 hour
  },

  // 10 attempts per 5 minutes per IP (general API)
  API_GENERAL: {
    maxAttempts: 10,
    windowSeconds: 300 // 5 minutes
  }
} as const
