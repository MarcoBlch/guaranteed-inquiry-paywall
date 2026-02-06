-- ============================================================================
-- Migration: Optimize Analytics View Performance
-- Date: 2026-02-03
-- Issue: RLS check runs per-row before aggregation (10k checks instead of 1)
-- Impact: Analytics views take 311ms mean, 23.9s total query time
-- ============================================================================

-- ===========================================
-- FIX 1: page_views_stats view
-- Move admin check AFTER aggregation
-- ===========================================

DROP VIEW IF EXISTS public.page_views_stats;

CREATE VIEW public.page_views_stats AS
SELECT
  page_path,
  total_views,
  unique_visitors,
  authenticated_users,
  view_date
FROM (
  -- Aggregation happens FIRST (no per-row RLS check)
  SELECT
    page_path,
    COUNT(*) as total_views,
    COUNT(DISTINCT session_id) as unique_visitors,
    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as authenticated_users,
    DATE_TRUNC('day', created_at) as view_date
  FROM public.page_views
  GROUP BY page_path, DATE_TRUNC('day', created_at)
) stats
WHERE public.is_admin()  -- Admin check happens ONCE on aggregated result
ORDER BY view_date DESC, total_views DESC;

COMMENT ON VIEW public.page_views_stats IS
  'PERFORMANCE OPTIMIZED: Aggregates BEFORE RLS check (1 admin check instead of 10k). Admin-only view.';

-- ===========================================
-- FIX 2: daily_analytics_summary view
-- Move admin check AFTER aggregation
-- ===========================================

DROP VIEW IF EXISTS public.daily_analytics_summary;

CREATE VIEW public.daily_analytics_summary AS
SELECT
  date,
  total_views,
  unique_visitors,
  authenticated_users,
  landing_page_views,
  payment_page_views,
  dashboard_views
FROM (
  -- Aggregation happens FIRST (no per-row RLS check)
  SELECT
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_views,
    COUNT(DISTINCT session_id) as unique_visitors,
    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as authenticated_users,
    COUNT(*) FILTER (WHERE page_path = '/') as landing_page_views,
    COUNT(*) FILTER (WHERE page_path LIKE '/pay/%') as payment_page_views,
    COUNT(*) FILTER (WHERE page_path = '/dashboard') as dashboard_views
  FROM public.page_views
  GROUP BY DATE_TRUNC('day', created_at)
) daily
WHERE public.is_admin()  -- Admin check happens ONCE on aggregated result
ORDER BY date DESC;

COMMENT ON VIEW public.daily_analytics_summary IS
  'PERFORMANCE OPTIMIZED: Aggregates BEFORE RLS check. Daily metrics for admin dashboard.';

-- ===========================================
-- INDEX: Support view performance
-- Note: CONCURRENTLY removed - not supported in migration transactions
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_page_views_path_date
  ON public.page_views(page_path, created_at DESC);

COMMENT ON INDEX idx_page_views_path_date IS
  'PERFORMANCE: Supports page_views_stats view aggregations';

-- ===========================================
-- ANALYZE table
-- ===========================================

ANALYZE public.page_views;

-- ===========================================
-- Verification queries (run after migration)
-- ===========================================

-- Check query plan shows aggregation before RLS:
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM page_views_stats LIMIT 10;

-- Expected: Subquery Scan → Aggregate → Seq Scan (NOT: Filter → Aggregate)
