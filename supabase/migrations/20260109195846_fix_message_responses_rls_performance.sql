-- ============================================================
-- FIX: Optimize message_responses RLS policy and add indexes
-- ============================================================
--
-- PROBLEM:
-- The current RLS policy uses a nested IN subquery which causes
-- performance issues when querying with multiple message IDs (e.g., 32).
-- This results in 500 Internal Server Error due to query complexity.
--
-- SOLUTION:
-- 1. Add missing indexes for better query performance
-- 2. Replace IN subquery with EXISTS for more efficient execution
-- 3. Use JOIN-based logic instead of nested SELECT
--
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Add performance indexes
-- ============================================================

-- Index on message_responses.message_id for FK lookups and RLS checks
-- This is critical for the RLS policy performance
CREATE INDEX IF NOT EXISTS idx_message_responses_message_id
  ON message_responses(message_id);

-- Index on messages.user_id for RLS policy lookups
-- This helps the EXISTS clause in the RLS policy
CREATE INDEX IF NOT EXISTS idx_messages_user_id
  ON messages(user_id);

-- Composite index for common query patterns (message_id + has_response)
-- This helps dashboard queries that filter by response status
CREATE INDEX IF NOT EXISTS idx_message_responses_message_has_response
  ON message_responses(message_id, has_response);

-- ============================================================
-- STEP 2: Optimize RLS policy for message_responses SELECT
-- ============================================================

-- Drop the inefficient policy
DROP POLICY IF EXISTS "responses_select_policy" ON message_responses;

-- Create optimized policy using EXISTS with JOIN
-- EXISTS is more efficient than IN for this use case because:
-- 1. It short-circuits on first match (doesn't scan all messages)
-- 2. PostgreSQL can optimize JOIN plans better than nested subqueries
-- 3. It works better with the indexes we just created
CREATE POLICY "responses_select_policy" ON message_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM messages m
      WHERE m.id = message_responses.message_id
        AND (m.user_id = auth.uid() OR public.is_admin())
    )
  );

-- ============================================================
-- STEP 3: Optimize other message_responses RLS policies
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "responses_insert_policy" ON message_responses;
DROP POLICY IF EXISTS "responses_update_policy" ON message_responses;

-- Recreate with same EXISTS pattern for consistency
CREATE POLICY "responses_insert_policy" ON message_responses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM messages m
      WHERE m.id = message_responses.message_id
        AND (m.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "responses_update_policy" ON message_responses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM messages m
      WHERE m.id = message_responses.message_id
        AND (m.user_id = auth.uid() OR public.is_admin())
    )
  );

-- ============================================================
-- STEP 4: Verify and analyze
-- ============================================================

-- Check that indexes were created
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'message_responses'
    AND indexname IN (
      'idx_message_responses_message_id',
      'idx_message_responses_message_has_response'
    );

  IF index_count = 2 THEN
    RAISE NOTICE 'message_responses indexes created successfully ✓';
  ELSE
    RAISE WARNING 'Expected 2 indexes, found %', index_count;
  END IF;
END $$;

-- Check that policies were recreated
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'message_responses'
    AND policyname IN (
      'responses_select_policy',
      'responses_insert_policy',
      'responses_update_policy'
    );

  IF policy_count = 3 THEN
    RAISE NOTICE 'message_responses RLS policies optimized successfully ✓';
  ELSE
    RAISE WARNING 'Expected 3 policies, found %', policy_count;
  END IF;
END $$;

COMMIT;

-- ============================================================
-- PERFORMANCE NOTES:
-- ============================================================
--
-- BEFORE (inefficient IN subquery):
-- - RLS evaluates: message_id IN (SELECT id FROM messages WHERE user_id = auth.uid())
-- - For 32 message IDs: PostgreSQL scans all message_responses rows
-- - Then filters by the 32 IDs from .in() clause
-- - Without index on message_id: Full table scan
-- - Result: Query timeout or 500 error
--
-- AFTER (optimized EXISTS with indexes):
-- - Index lookup on message_responses.message_id
-- - EXISTS short-circuits on first match
-- - Index lookup on messages.user_id for auth check
-- - Result: Fast, scalable query even with 100+ message IDs
--
-- ============================================================
