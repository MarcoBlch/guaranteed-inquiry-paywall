-- ============================================================
-- ANALYTICS: Page Views Tracking
-- ============================================================

-- Create page_views table for simple analytics tracking
CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Page information
  page_path TEXT NOT NULL,
  page_title TEXT,

  -- User information (nullable for anonymous tracking)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Session tracking (browser-generated, not user account)
  session_id TEXT,

  -- Technical details
  referrer TEXT,
  user_agent TEXT,

  -- Privacy-friendly location (no IP storage)
  -- Could be populated by a separate service if needed
  country_code TEXT
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON public.page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON public.page_views(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON public.page_views(session_id) WHERE session_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Only admins can view analytics
CREATE POLICY "page_views_select_policy" ON public.page_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Allow service role to insert (Edge Functions)
CREATE POLICY "page_views_insert_policy" ON public.page_views
  FOR INSERT
  WITH CHECK (true);

-- Create analytics view for easy querying
CREATE OR REPLACE VIEW public.page_views_stats AS
SELECT
  page_path,
  COUNT(*) as total_views,
  COUNT(DISTINCT session_id) as unique_visitors,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as authenticated_users,
  DATE_TRUNC('day', created_at) as view_date
FROM page_views
WHERE
  -- Only return data if current user is admin
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
GROUP BY page_path, DATE_TRUNC('day', created_at)
ORDER BY view_date DESC, total_views DESC;

GRANT SELECT ON public.page_views_stats TO authenticated;

-- Daily summary view
CREATE OR REPLACE VIEW public.daily_analytics_summary AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_views,
  COUNT(DISTINCT session_id) as unique_visitors,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as authenticated_users,
  COUNT(*) FILTER (WHERE page_path = '/') as landing_page_views,
  COUNT(*) FILTER (WHERE page_path LIKE '/pay/%') as payment_page_views,
  COUNT(*) FILTER (WHERE page_path = '/dashboard') as dashboard_views
FROM page_views
WHERE
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

GRANT SELECT ON public.daily_analytics_summary TO authenticated;

COMMENT ON TABLE public.page_views IS 'Privacy-friendly page view tracking - no IP addresses stored';
COMMENT ON VIEW public.page_views_stats IS 'Page view statistics grouped by path and date - admin only';
COMMENT ON VIEW public.daily_analytics_summary IS 'Daily analytics summary - admin only';
