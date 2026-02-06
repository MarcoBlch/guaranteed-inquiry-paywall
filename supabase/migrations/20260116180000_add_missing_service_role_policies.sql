-- ============================================================================
-- Add Missing Service Role Policies for Admin Tables
-- ============================================================================
-- The previous migration (20260116160000) removed service_role policies
-- but didn't recreate them. Service role needs full access for Edge Functions.
-- ============================================================================

-- PLATFORM_SETTINGS: Service role full access
DROP POLICY IF EXISTS "platform_settings_service_role" ON public.platform_settings;
CREATE POLICY "platform_settings_service_role" ON public.platform_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- INVITE_CODES: Service role full access
DROP POLICY IF EXISTS "invite_codes_service_role" ON public.invite_codes;
CREATE POLICY "invite_codes_service_role" ON public.invite_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- USER_TIERS: Service role full access
DROP POLICY IF EXISTS "user_tiers_service_role" ON public.user_tiers;
CREATE POLICY "user_tiers_service_role" ON public.user_tiers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ADMIN_ACTIONS: Service role full access
DROP POLICY IF EXISTS "admin_actions_service_role" ON public.admin_actions;
CREATE POLICY "admin_actions_service_role" ON public.admin_actions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
