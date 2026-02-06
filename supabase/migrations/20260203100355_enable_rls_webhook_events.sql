-- ============================================================================
-- Migration: Enable RLS on webhook_events Table
-- Date: 2026-02-03
-- Issue: webhook_events table has no RLS protection
-- Risk: MEDIUM - Authenticated users can view all Stripe events
-- ============================================================================

-- Enable RLS on webhook_events table
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- POLICY 1: Service role can insert
-- Used by: stripe-connect-webhook Edge Function
-- ===========================================

DROP POLICY IF EXISTS "service_role_insert_webhook_events" ON public.webhook_events;
CREATE POLICY "service_role_insert_webhook_events"
  ON public.webhook_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON POLICY "service_role_insert_webhook_events" ON public.webhook_events IS
  'Allows Edge Functions (service_role) to insert webhook events for idempotency tracking';

-- ===========================================
-- POLICY 2: Service role can select
-- Used by: cleanup_old_webhook_events function
-- ===========================================

DROP POLICY IF EXISTS "service_role_select_webhook_events" ON public.webhook_events;
CREATE POLICY "service_role_select_webhook_events"
  ON public.webhook_events
  FOR SELECT
  TO service_role
  USING (true);

-- ===========================================
-- POLICY 3: Service role can delete
-- Used by: cleanup_old_webhook_events function
-- ===========================================

DROP POLICY IF EXISTS "service_role_delete_webhook_events" ON public.webhook_events;
CREATE POLICY "service_role_delete_webhook_events"
  ON public.webhook_events
  FOR DELETE
  TO service_role
  USING (true);

-- ===========================================
-- POLICY 4: Admins can view (optional)
-- Allows admins to inspect webhook history
-- ===========================================

DROP POLICY IF EXISTS "admins_view_webhook_events" ON public.webhook_events;
CREATE POLICY "admins_view_webhook_events"
  ON public.webhook_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

COMMENT ON POLICY "admins_view_webhook_events" ON public.webhook_events IS
  'Allows admin users to view webhook event history for debugging';

-- ===========================================
-- Update table comment
-- ===========================================

COMMENT ON TABLE public.webhook_events IS
  'RLS ENABLED: Tracks processed Stripe webhook events for idempotency. Only accessible by service_role and admins.';
