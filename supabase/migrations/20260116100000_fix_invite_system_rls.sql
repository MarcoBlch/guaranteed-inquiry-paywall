-- ============================================================================
-- FIX: Invite System RLS Policies
-- ============================================================================
-- The original RLS policies caused stack overflow due to recursive is_admin() calls
-- This migration fixes the policies to avoid recursion
-- ============================================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own created codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Users can view codes they used" ON public.invite_codes;
DROP POLICY IF EXISTS "Admins can view all invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Admins can insert invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "System can insert codes via functions" ON public.invite_codes;
DROP POLICY IF EXISTS "Users can update own invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Admins can update invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "System can update codes" ON public.invite_codes;

DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins can update platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins can insert platform settings" ON public.platform_settings;

DROP POLICY IF EXISTS "Users can view own tier" ON public.user_tiers;
DROP POLICY IF EXISTS "Admins can view all user tiers" ON public.user_tiers;
DROP POLICY IF EXISTS "Admins can update user tiers" ON public.user_tiers;
DROP POLICY IF EXISTS "System can manage user tiers" ON public.user_tiers;

-- ============================================================================
-- INVITE_CODES: Simplified policies without recursive admin check
-- ============================================================================

-- Allow authenticated users to view their own created codes
CREATE POLICY "invite_codes_select_own_created"
  ON public.invite_codes FOR SELECT
  TO authenticated
  USING (created_by_user_id = auth.uid());

-- Allow authenticated users to view codes they used
CREATE POLICY "invite_codes_select_own_used"
  ON public.invite_codes FOR SELECT
  TO authenticated
  USING (used_by_user_id = auth.uid());

-- Allow service role full access (for Edge Functions)
CREATE POLICY "invite_codes_service_role"
  ON public.invite_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow admins to view all (using direct table lookup to avoid recursion)
CREATE POLICY "invite_codes_admin_select"
  ON public.invite_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow admins to insert
CREATE POLICY "invite_codes_admin_insert"
  ON public.invite_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow admins to update
CREATE POLICY "invite_codes_admin_update"
  ON public.invite_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- PLATFORM_SETTINGS: Public read, admin write
-- ============================================================================

-- Anyone can read (needed for signup flow to check invite_only_mode)
CREATE POLICY "platform_settings_public_read"
  ON public.platform_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role full access
CREATE POLICY "platform_settings_service_role"
  ON public.platform_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can update (direct lookup)
CREATE POLICY "platform_settings_admin_update"
  ON public.platform_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can insert
CREATE POLICY "platform_settings_admin_insert"
  ON public.platform_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- USER_TIERS: User can see own, admins can see all
-- ============================================================================

-- Users can view their own tier
CREATE POLICY "user_tiers_select_own"
  ON public.user_tiers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role full access (for triggers and Edge Functions)
CREATE POLICY "user_tiers_service_role"
  ON public.user_tiers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view all
CREATE POLICY "user_tiers_admin_select"
  ON public.user_tiers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can update
CREATE POLICY "user_tiers_admin_update"
  ON public.user_tiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can insert
CREATE POLICY "user_tiers_admin_insert"
  ON public.user_tiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
