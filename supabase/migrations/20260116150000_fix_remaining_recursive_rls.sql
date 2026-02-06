-- ============================================================================
-- FIX: Remaining Recursive RLS Policies
-- ============================================================================
-- The is_admin() function can cause stack overflow when used in RLS policies
-- This migration fixes all remaining tables that use is_admin() in their policies
-- ============================================================================

-- ============================================================================
-- EMAIL_LOGS: Fix RLS policy
-- ============================================================================

DROP POLICY IF EXISTS "email_logs_select_policy" ON public.email_logs;

CREATE POLICY "email_logs_select_policy" ON public.email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.messages m
      WHERE m.id = email_logs.message_id
        AND m.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- EMAIL_RESPONSE_TRACKING: Fix RLS policy
-- ============================================================================

DROP POLICY IF EXISTS "response_tracking_select_policy" ON public.email_response_tracking;

CREATE POLICY "response_tracking_select_policy" ON public.email_response_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.messages m
      WHERE m.id = email_response_tracking.message_id
        AND m.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- PROFILES: Check and fix any admin-related policies
-- ============================================================================

-- Drop problematic policies if they exist
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;

-- Ensure profiles has proper policies without recursion
-- Users can always read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can view all profiles (using direct lookup to avoid recursion)
CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- Service role has full access
DROP POLICY IF EXISTS "profiles_service_role" ON public.profiles;
CREATE POLICY "profiles_service_role" ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- MESSAGE_RESPONSES: Check and fix policies
-- ============================================================================

DROP POLICY IF EXISTS "message_responses_admin_policy" ON public.message_responses;

-- Admins can view all message responses
CREATE POLICY "message_responses_admin_select" ON public.message_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- ESCROW_TRANSACTIONS: Check and fix policies
-- ============================================================================

DROP POLICY IF EXISTS "escrow_transactions_admin_policy" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Admins can view all escrow transactions" ON public.escrow_transactions;

-- Admins can view all transactions
CREATE POLICY "escrow_transactions_admin_select" ON public.escrow_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- MESSAGES: Check and fix policies
-- ============================================================================

DROP POLICY IF EXISTS "messages_admin_policy" ON public.messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;

-- Admins can view all messages
CREATE POLICY "messages_admin_select" ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- ADMIN_ACTIONS: Fix policies
-- ============================================================================

DROP POLICY IF EXISTS "admin_actions_select_policy" ON public.admin_actions;
DROP POLICY IF EXISTS "admin_actions_insert_policy" ON public.admin_actions;

-- Admins can view admin actions
CREATE POLICY "admin_actions_admin_select" ON public.admin_actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Service role can insert admin actions
CREATE POLICY "admin_actions_service_insert" ON public.admin_actions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins can insert via authenticated role too
CREATE POLICY "admin_actions_admin_insert" ON public.admin_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
