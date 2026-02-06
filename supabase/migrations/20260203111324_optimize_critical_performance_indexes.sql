-- ============================================================================
-- Migration: Optimize Critical Performance Indexes
-- Date: 2026-02-03
-- Issue: Missing composite indexes causing full table scans
-- Impact: Cron job (check-escrow-timeouts) runs every 10 min, scans all rows
-- Note: CONCURRENTLY removed - not supported in migration transactions
-- ============================================================================

-- ===========================================
-- INDEX 1: Escrow transactions status + expires_at
-- CRITICAL: Used by check-escrow-timeouts cron job
-- Partial index (only 'held' status) reduces index size
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_status_expires_held
  ON public.escrow_transactions(status, expires_at)
  WHERE status = 'held';

COMMENT ON INDEX idx_escrow_transactions_status_expires_held IS
  'PERFORMANCE: Optimizes check-escrow-timeouts cron job (runs every 10min). Partial index on held transactions.';

-- ===========================================
-- INDEX 2: Email logs message_id + created_at
-- Used by: Dashboard email tracking queries
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_email_logs_message_created
  ON public.email_logs(message_id, created_at DESC);

COMMENT ON INDEX idx_email_logs_message_created IS
  'PERFORMANCE: Optimizes dashboard email log queries. Composite index for message timeline.';

-- ===========================================
-- INDEX 3: Messages user_id + created_at
-- Used by: Dashboard message list queries
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_messages_user_created
  ON public.messages(user_id, created_at DESC);

COMMENT ON INDEX idx_messages_user_created IS
  'PERFORMANCE: Optimizes dashboard message queries. Composite index for user message history.';

-- ===========================================
-- ANALYZE tables to update query planner
-- ===========================================

ANALYZE public.escrow_transactions;
ANALYZE public.email_logs;
ANALYZE public.messages;

-- ===========================================
-- Verification queries (run after migration)
-- ===========================================

-- Check index usage:
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM escrow_transactions
-- WHERE status = 'held' AND expires_at < NOW();

-- Verify indexes exist:
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename IN ('escrow_transactions', 'email_logs', 'messages')
-- ORDER BY tablename, indexname;
