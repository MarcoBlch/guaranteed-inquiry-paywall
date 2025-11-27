-- Create rate_limits table for rate limiting authentication endpoints
-- Tracks attempts per IP/identifier with automatic expiration

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  limit_key TEXT NOT NULL, -- Composite key: 'action:ip:identifier'
  limit_type TEXT NOT NULL, -- Type of limit: 'login', 'password_reset', etc.
  ip_address TEXT NOT NULL,
  identifier TEXT NULL, -- Optional user identifier (email, user_id)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Index for fast lookups and cleanup
  CONSTRAINT check_limit_key_format CHECK (length(limit_key) > 0)
);

-- Indexes for performance
CREATE INDEX idx_rate_limits_limit_key ON public.rate_limits(limit_key);
CREATE INDEX idx_rate_limits_created_at ON public.rate_limits(created_at);
CREATE INDEX idx_rate_limits_limit_type ON public.rate_limits(limit_type);

-- Enable RLS (service role only)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (no user access)
CREATE POLICY "Service role only access"
  ON public.rate_limits
  FOR ALL
  USING (false); -- No user access, service role bypasses RLS

-- Comment
COMMENT ON TABLE public.rate_limits IS 'Rate limiting tracking for authentication endpoints. Records are auto-cleaned after expiration.';
COMMENT ON COLUMN public.rate_limits.limit_key IS 'Composite key format: action:ip:identifier (e.g., login:192.168.1.1:user@example.com)';
COMMENT ON COLUMN public.rate_limits.limit_type IS 'Type of rate limit being tracked (login, password_reset, email_change, account_deletion)';
COMMENT ON COLUMN public.rate_limits.identifier IS 'Optional user identifier for user-based limits (email, user_id)';
