-- ============================================================
-- FIX: Optimize email_logs and email_response_tracking RLS
-- ============================================================
--
-- PROBLEM:
-- Same issue as message_responses - these tables use inefficient
-- IN subqueries in their RLS policies that will cause performance
-- issues when querying with multiple message IDs.
--
-- SOLUTION:
-- Apply the same optimization pattern:
-- 1. Add missing indexes
-- 2. Replace IN with EXISTS
--
-- ============================================================

BEGIN;

-- ============================================================
-- EMAIL_LOGS TABLE
-- ============================================================

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_message_id
  ON email_logs(message_id);

-- Optimize RLS policy
DROP POLICY IF EXISTS "email_logs_select_policy" ON email_logs;

CREATE POLICY "email_logs_select_policy" ON email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM messages m
      WHERE m.id = email_logs.message_id
        AND (m.user_id = auth.uid() OR public.is_admin())
    )
  );

-- ============================================================
-- EMAIL_RESPONSE_TRACKING TABLE
-- ============================================================

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_email_response_tracking_message_id
  ON email_response_tracking(message_id);

-- Optimize RLS policy
DROP POLICY IF EXISTS "response_tracking_select_policy" ON email_response_tracking;

CREATE POLICY "response_tracking_select_policy" ON email_response_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM messages m
      WHERE m.id = email_response_tracking.message_id
        AND (m.user_id = auth.uid() OR public.is_admin())
    )
  );

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
  email_logs_indexes INTEGER;
  tracking_indexes INTEGER;
  email_logs_policies INTEGER;
  tracking_policies INTEGER;
BEGIN
  -- Check email_logs indexes
  SELECT COUNT(*) INTO email_logs_indexes
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'email_logs'
    AND indexname = 'idx_email_logs_message_id';

  -- Check email_response_tracking indexes
  SELECT COUNT(*) INTO tracking_indexes
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'email_response_tracking'
    AND indexname = 'idx_email_response_tracking_message_id';

  -- Check policies
  SELECT COUNT(*) INTO email_logs_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'email_logs'
    AND policyname = 'email_logs_select_policy';

  SELECT COUNT(*) INTO tracking_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'email_response_tracking'
    AND policyname = 'response_tracking_select_policy';

  IF email_logs_indexes = 1 AND tracking_indexes = 1 THEN
    RAISE NOTICE 'Indexes created successfully ✓';
  ELSE
    RAISE WARNING 'Index creation issue: email_logs=%, tracking=%',
      email_logs_indexes, tracking_indexes;
  END IF;

  IF email_logs_policies = 1 AND tracking_policies = 1 THEN
    RAISE NOTICE 'RLS policies optimized successfully ✓';
  ELSE
    RAISE WARNING 'Policy issue: email_logs=%, tracking=%',
      email_logs_policies, tracking_policies;
  END IF;
END $$;

COMMIT;

-- ============================================================
-- NOTES:
-- ============================================================
--
-- This migration prevents the same performance issues that affected
-- message_responses from occurring with email_logs and
-- email_response_tracking tables.
--
-- These tables are less frequently queried with multiple message IDs,
-- but applying the same optimization ensures consistent performance
-- across the entire schema.
--
-- ============================================================
