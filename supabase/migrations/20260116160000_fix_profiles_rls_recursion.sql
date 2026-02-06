-- ============================================================================
-- FIX: Profiles RLS Recursion (Critical)
-- ============================================================================
-- The profiles table had a recursive policy:
--   - profiles_admin_select checks profiles.is_admin
--   - This triggers RLS evaluation on profiles again
--   - Stack overflow!
--
-- SOLUTION:
-- Use a security definer function that bypasses RLS to check admin status
-- ============================================================================

-- First, drop the problematic policies
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_role" ON public.profiles;

-- Drop all existing select policies on profiles to start fresh
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND cmd = 'SELECT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Create a SECURITY DEFINER function that bypasses RLS to check admin
-- This prevents the recursion because SECURITY DEFINER runs as the function owner
CREATE OR REPLACE FUNCTION public.check_is_admin_no_rls(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = user_uuid),
    false
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_is_admin_no_rls(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_admin_no_rls(UUID) TO service_role;

-- Now create clean, non-recursive policies

-- 1. Users can always read their own profile
CREATE POLICY "profiles_own_select" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 2. Admins can read all profiles (uses security definer function to avoid recursion)
CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.check_is_admin_no_rls(auth.uid()) = true);

-- 3. Service role has full access
CREATE POLICY "profiles_service_all" ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "profiles_own_update" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 5. Users can insert their own profile (for signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "profiles_own_insert" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- Also fix other tables that reference profiles for admin checks
-- ============================================================================

-- EMAIL_LOGS
DROP POLICY IF EXISTS "email_logs_select_policy" ON public.email_logs;
CREATE POLICY "email_logs_select_policy" ON public.email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = email_logs.message_id AND m.user_id = auth.uid()
    )
    OR public.check_is_admin_no_rls(auth.uid()) = true
  );

-- EMAIL_RESPONSE_TRACKING
DROP POLICY IF EXISTS "response_tracking_select_policy" ON public.email_response_tracking;
CREATE POLICY "response_tracking_select_policy" ON public.email_response_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = email_response_tracking.message_id AND m.user_id = auth.uid()
    )
    OR public.check_is_admin_no_rls(auth.uid()) = true
  );

-- MESSAGE_RESPONSES
DROP POLICY IF EXISTS "message_responses_admin_select" ON public.message_responses;
CREATE POLICY "message_responses_admin_select" ON public.message_responses
  FOR SELECT
  TO authenticated
  USING (public.check_is_admin_no_rls(auth.uid()) = true);

-- ESCROW_TRANSACTIONS
DROP POLICY IF EXISTS "escrow_transactions_admin_select" ON public.escrow_transactions;
CREATE POLICY "escrow_transactions_admin_select" ON public.escrow_transactions
  FOR SELECT
  TO authenticated
  USING (public.check_is_admin_no_rls(auth.uid()) = true);

-- MESSAGES
DROP POLICY IF EXISTS "messages_admin_select" ON public.messages;
CREATE POLICY "messages_admin_select" ON public.messages
  FOR SELECT
  TO authenticated
  USING (public.check_is_admin_no_rls(auth.uid()) = true);

-- ADMIN_ACTIONS
DROP POLICY IF EXISTS "admin_actions_admin_select" ON public.admin_actions;
DROP POLICY IF EXISTS "admin_actions_admin_insert" ON public.admin_actions;

CREATE POLICY "admin_actions_admin_select" ON public.admin_actions
  FOR SELECT
  TO authenticated
  USING (public.check_is_admin_no_rls(auth.uid()) = true);

CREATE POLICY "admin_actions_admin_insert" ON public.admin_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.check_is_admin_no_rls(auth.uid()) = true);

-- ============================================================================
-- Update invite system policies to use the new function
-- ============================================================================

DROP POLICY IF EXISTS "invite_codes_admin_select" ON public.invite_codes;
DROP POLICY IF EXISTS "invite_codes_admin_insert" ON public.invite_codes;
DROP POLICY IF EXISTS "invite_codes_admin_update" ON public.invite_codes;

CREATE POLICY "invite_codes_admin_select" ON public.invite_codes
  FOR SELECT TO authenticated
  USING (public.check_is_admin_no_rls(auth.uid()) = true);

CREATE POLICY "invite_codes_admin_insert" ON public.invite_codes
  FOR INSERT TO authenticated
  WITH CHECK (public.check_is_admin_no_rls(auth.uid()) = true);

CREATE POLICY "invite_codes_admin_update" ON public.invite_codes
  FOR UPDATE TO authenticated
  USING (public.check_is_admin_no_rls(auth.uid()) = true);

-- PLATFORM_SETTINGS
DROP POLICY IF EXISTS "platform_settings_admin_update" ON public.platform_settings;
DROP POLICY IF EXISTS "platform_settings_admin_insert" ON public.platform_settings;

CREATE POLICY "platform_settings_admin_update" ON public.platform_settings
  FOR UPDATE TO authenticated
  USING (public.check_is_admin_no_rls(auth.uid()) = true);

CREATE POLICY "platform_settings_admin_insert" ON public.platform_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.check_is_admin_no_rls(auth.uid()) = true);

-- USER_TIERS
DROP POLICY IF EXISTS "user_tiers_admin_select" ON public.user_tiers;
DROP POLICY IF EXISTS "user_tiers_admin_update" ON public.user_tiers;
DROP POLICY IF EXISTS "user_tiers_admin_insert" ON public.user_tiers;

CREATE POLICY "user_tiers_admin_select" ON public.user_tiers
  FOR SELECT TO authenticated
  USING (public.check_is_admin_no_rls(auth.uid()) = true);

CREATE POLICY "user_tiers_admin_update" ON public.user_tiers
  FOR UPDATE TO authenticated
  USING (public.check_is_admin_no_rls(auth.uid()) = true);

CREATE POLICY "user_tiers_admin_insert" ON public.user_tiers
  FOR INSERT TO authenticated
  WITH CHECK (public.check_is_admin_no_rls(auth.uid()) = true);
