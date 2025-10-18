-- ============================================================
-- RLS Security Verification Script
-- ============================================================
-- Run this in Supabase SQL Editor while logged in as admin
-- ============================================================

-- Test 1: Check RLS is enabled on all tables
SELECT
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity THEN '✓ ENABLED'
    ELSE '✗ DISABLED (SECURITY RISK!)'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'messages',
    'escrow_transactions',
    'email_logs',
    'message_responses',
    'email_response_tracking',
    'admin_actions',
    'security_audit'
  )
ORDER BY tablename;

-- Expected: All should show rls_enabled = true

-- ============================================================

-- Test 2: Verify admin helper function exists and works
SELECT
  auth.is_admin() as am_i_admin,
  CASE
    WHEN auth.is_admin() THEN '✓ You have admin access'
    ELSE '✗ You are a regular user'
  END as status;

-- Expected: Returns true if you're logged in as marc.bernard@ece-france.com

-- ============================================================

-- Test 3: Count policies per table
SELECT
  tablename,
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) >= 2 THEN '✓ Has policies'
    ELSE '✗ Missing policies'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Expected: Each critical table should have 2-3 policies

-- ============================================================

-- Test 4: List all RLS policies
SELECT
  tablename,
  policyname,
  cmd as operation,
  CASE permissive
    WHEN 'PERMISSIVE' THEN 'Allow'
    ELSE 'Restrict'
  END as type
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- ============================================================

-- Test 5: Check views return data for admin
SELECT
  'email_service_stats' as view_name,
  COUNT(*) as row_count,
  CASE
    WHEN COUNT(*) > 0 THEN '✓ Returns data'
    WHEN auth.is_admin() THEN '⚠ No data yet (expected if no emails sent)'
    ELSE '✗ Access denied (you are not admin)'
  END as status
FROM email_service_stats;

SELECT
  'response_tracking_stats' as view_name,
  COUNT(*) as row_count,
  CASE
    WHEN COUNT(*) > 0 THEN '✓ Returns data'
    WHEN auth.is_admin() THEN '⚠ No data yet (expected if no responses tracked)'
    ELSE '✗ Access denied (you are not admin)'
  END as status
FROM response_tracking_stats;

-- ============================================================

-- Test 6: Verify your admin status
SELECT
  u.email,
  p.is_admin,
  p.stripe_onboarding_completed,
  CASE
    WHEN p.is_admin THEN '✓ Admin privileges active'
    ELSE '✗ Regular user'
  END as admin_status
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.id = auth.uid();

-- Expected: is_admin should be true for marc.bernard@ece-france.com

-- ============================================================

-- Test 7: Security check - find tables WITHOUT RLS
SELECT
  schemaname,
  tablename,
  '✗ SECURITY RISK: RLS NOT ENABLED' as warning
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT IN (
    -- Exclude tables that don't need RLS
    'schema_migrations',
    'supabase_migrations',
    '_supabase_migrations'
  )
ORDER BY tablename;

-- Expected: Should return NO rows (all tables should have RLS)

-- ============================================================

-- Test 8: Check for SECURITY DEFINER functions (potential risk)
SELECT
  n.nspname as schema,
  p.proname as function_name,
  CASE p.prosecdef
    WHEN true THEN '⚠ SECURITY DEFINER (review needed)'
    ELSE '✓ SECURITY INVOKER (safe)'
  END as security_mode,
  pg_get_userbyid(p.proowner) as owner
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'auth'
  AND p.proname LIKE '%admin%'
ORDER BY p.proname;

-- Expected: auth.is_admin() should be SECURITY DEFINER (this is intentional)

-- ============================================================

-- Test 9: Verify profiles table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('id', 'is_admin', 'stripe_account_id', 'stripe_onboarding_completed')
ORDER BY ordinal_position;

-- Expected: is_admin column exists with type boolean

-- ============================================================

-- Test 10: Check admin user exists
SELECT
  COUNT(*) as admin_count,
  CASE
    WHEN COUNT(*) > 0 THEN '✓ At least one admin exists'
    ELSE '✗ No admins configured!'
  END as status
FROM profiles
WHERE is_admin = true;

-- Expected: At least 1 admin (marc.bernard@ece-france.com)

-- ============================================================

-- Test 11: Performance check - indexes on critical columns
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%admin%'
    OR indexname LIKE '%user_id%'
    OR indexname LIKE '%recipient%'
  )
ORDER BY tablename, indexname;

-- Expected: Should see idx_profiles_is_admin and other performance indexes

-- ============================================================
-- SUMMARY
-- ============================================================

SELECT
  '🔒 RLS SECURITY AUDIT SUMMARY' as audit_section,
  (
    SELECT COUNT(*)
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'messages', 'escrow_transactions',
        'email_logs', 'message_responses', 'email_response_tracking'
      )
      AND rowsecurity = true
  ) as tables_with_rls,
  (
    SELECT COUNT(*)
    FROM pg_policies
    WHERE schemaname = 'public'
  ) as total_policies,
  (
    SELECT COUNT(*)
    FROM profiles
    WHERE is_admin = true
  ) as admin_users,
  CASE
    WHEN auth.is_admin() THEN '✓ Running as admin'
    ELSE '⚠ Running as regular user'
  END as current_user_status;
