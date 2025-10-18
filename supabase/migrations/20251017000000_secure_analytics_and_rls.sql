-- ============================================================
-- SECURITY FIX: Analytics views + comprehensive RLS policies
-- ============================================================

-- Ensure is_admin column exists in profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
    CREATE INDEX idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

    -- Set marc.bernard@ece-france.com as admin
    UPDATE profiles
    SET is_admin = true
    WHERE id IN (
      SELECT id FROM auth.users WHERE email = 'marc.bernard@ece-france.com'
    );
  END IF;
END $$;

-- ============================================================
-- FIX 1: Secure Analytics Views (Remove SECURITY DEFINER)
-- ============================================================

DROP VIEW IF EXISTS public.email_service_stats CASCADE;
DROP VIEW IF EXISTS public.response_tracking_stats CASCADE;

-- Email service stats - admin only
CREATE VIEW public.email_service_stats AS
SELECT
  email_service_provider,
  COUNT(*) as total_sent,
  SUM(CASE WHEN delivered_at IS NOT NULL THEN 1 ELSE 0 END) as delivered,
  SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as opened,
  SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as clicked,
  SUM(CASE WHEN failed_at IS NOT NULL THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN bounced_at IS NOT NULL THEN 1 ELSE 0 END) as bounced,
  SUM(CASE WHEN spam_at IS NOT NULL THEN 1 ELSE 0 END) as spam,
  ROUND(
    100.0 * SUM(CASE WHEN delivered_at IS NOT NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
    2
  ) as delivery_rate,
  ROUND(
    100.0 * SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
    2
  ) as open_rate,
  ROUND(
    100.0 * SUM(CASE WHEN failed_at IS NOT NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
    2
  ) as failure_rate
FROM email_logs
WHERE
  -- Only return data if current user is admin
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
GROUP BY email_service_provider;

-- Response tracking stats - admin only
CREATE VIEW public.response_tracking_stats AS
SELECT
  COUNT(*) as total_responses,
  SUM(CASE WHEN within_deadline = true THEN 1 ELSE 0 END) as on_time_responses,
  SUM(CASE WHEN grace_period_used = true THEN 1 ELSE 0 END) as grace_period_responses,
  ROUND(
    100.0 * SUM(CASE WHEN within_deadline = true THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
    2
  ) as on_time_percentage,
  AVG(quality_score) as avg_quality_score,
  SUM(CASE WHEN response_detected_method = 'webhook' THEN 1 ELSE 0 END) as webhook_detected,
  SUM(CASE WHEN response_detected_method = 'manual' THEN 1 ELSE 0 END) as manually_marked
FROM email_response_tracking
WHERE
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );

GRANT SELECT ON public.email_service_stats TO authenticated;
GRANT SELECT ON public.response_tracking_stats TO authenticated;

-- ============================================================
-- FIX 2: Comprehensive RLS Policies
-- ============================================================

-- Helper function for admin check (reusable)
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================
-- PROFILES TABLE
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Users see own profile, admins see all
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT
  USING (
    auth.uid() = id  -- Own profile
    OR auth.is_admin()  -- Or admin
  );

-- Users can update own profile, admins can update any
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR auth.is_admin()
  );

-- Only admins can insert profiles (via signup trigger)
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT
  WITH CHECK (auth.is_admin());

-- ============================================================
-- MESSAGES TABLE
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;

-- Users see own messages (as recipient), admins see all
CREATE POLICY "messages_select_policy" ON messages
  FOR SELECT
  USING (
    auth.uid() = user_id  -- Received by user
    OR auth.is_admin()  -- Or admin
  );

-- Service role can insert messages (anonymous senders)
CREATE POLICY "messages_insert_policy" ON messages
  FOR INSERT
  WITH CHECK (auth.is_admin());

-- Users can update own messages, admins can update any
CREATE POLICY "messages_update_policy" ON messages
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR auth.is_admin()
  );

-- ============================================================
-- ESCROW_TRANSACTIONS TABLE
-- ============================================================
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON escrow_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON escrow_transactions;

-- Users see own transactions, admins see all
CREATE POLICY "transactions_select_policy" ON escrow_transactions
  FOR SELECT
  USING (
    auth.uid() = recipient_user_id  -- User's transaction
    OR auth.is_admin()  -- Or admin
  );

-- Only system can insert transactions (via Edge Functions with service role)
CREATE POLICY "transactions_insert_policy" ON escrow_transactions
  FOR INSERT
  WITH CHECK (auth.is_admin());

-- Only system/admin can update transactions
CREATE POLICY "transactions_update_policy" ON escrow_transactions
  FOR UPDATE
  USING (auth.is_admin());

-- ============================================================
-- EMAIL_LOGS TABLE
-- ============================================================
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own email logs" ON email_logs;
DROP POLICY IF EXISTS "Admins can view all email logs" ON email_logs;

-- Users see emails for their messages, admins see all
CREATE POLICY "email_logs_select_policy" ON email_logs
  FOR SELECT
  USING (
    message_id IN (
      SELECT id FROM messages
      WHERE user_id = auth.uid()
    )
    OR auth.is_admin()
  );

-- Only system can insert/update email logs
CREATE POLICY "email_logs_insert_policy" ON email_logs
  FOR INSERT
  WITH CHECK (auth.is_admin());

CREATE POLICY "email_logs_update_policy" ON email_logs
  FOR UPDATE
  USING (auth.is_admin());

-- ============================================================
-- MESSAGE_RESPONSES TABLE
-- ============================================================
ALTER TABLE message_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own responses" ON message_responses;
DROP POLICY IF EXISTS "Admins can view all responses" ON message_responses;

-- Users see responses for their messages, admins see all
CREATE POLICY "responses_select_policy" ON message_responses
  FOR SELECT
  USING (
    message_id IN (
      SELECT id FROM messages
      WHERE user_id = auth.uid()
    )
    OR auth.is_admin()
  );

-- Users can insert responses for their messages
CREATE POLICY "responses_insert_policy" ON message_responses
  FOR INSERT
  WITH CHECK (
    message_id IN (
      SELECT id FROM messages
      WHERE user_id = auth.uid()
    )
    OR auth.is_admin()
  );

-- Users can update responses for their messages
CREATE POLICY "responses_update_policy" ON message_responses
  FOR UPDATE
  USING (
    message_id IN (
      SELECT id FROM messages
      WHERE user_id = auth.uid()
    )
    OR auth.is_admin()
  );

-- ============================================================
-- EMAIL_RESPONSE_TRACKING TABLE
-- ============================================================
ALTER TABLE email_response_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own response tracking" ON email_response_tracking;
DROP POLICY IF EXISTS "Admins can view all response tracking" ON email_response_tracking;

-- Users see tracking for their emails, admins see all
CREATE POLICY "response_tracking_select_policy" ON email_response_tracking
  FOR SELECT
  USING (
    message_id IN (
      SELECT id FROM messages
      WHERE user_id = auth.uid()
    )
    OR auth.is_admin()
  );

-- Only system can insert/update tracking
CREATE POLICY "response_tracking_insert_policy" ON email_response_tracking
  FOR INSERT
  WITH CHECK (auth.is_admin());

CREATE POLICY "response_tracking_update_policy" ON email_response_tracking
  FOR UPDATE
  USING (auth.is_admin());

-- ============================================================
-- ADMIN_ACTIONS TABLE (if exists)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_actions') THEN
    ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy
    DROP POLICY IF EXISTS "Only admins can view admin actions" ON admin_actions;

    -- Only admins can view/insert admin actions
    EXECUTE 'CREATE POLICY "admin_actions_select_policy" ON admin_actions
      FOR SELECT
      USING (auth.is_admin())';

    EXECUTE 'CREATE POLICY "admin_actions_insert_policy" ON admin_actions
      FOR INSERT
      WITH CHECK (auth.is_admin())';
  END IF;
END $$;

-- ============================================================
-- SECURITY_AUDIT TABLE (if exists)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_audit') THEN
    ALTER TABLE security_audit ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Only admins can view security audit" ON security_audit;

    EXECUTE 'CREATE POLICY "security_audit_select_policy" ON security_audit
      FOR SELECT
      USING (auth.is_admin())';

    EXECUTE 'CREATE POLICY "security_audit_insert_policy" ON security_audit
      FOR INSERT
      WITH CHECK (true)';  -- System can log all events
  END IF;
END $$;

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Verify RLS is enabled
DO $$
DECLARE
  tables_without_rls TEXT[];
BEGIN
  SELECT array_agg(tablename)
  INTO tables_without_rls
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'profiles',
      'messages',
      'escrow_transactions',
      'email_logs',
      'message_responses',
      'email_response_tracking'
    )
    AND rowsecurity = false;

  IF array_length(tables_without_rls, 1) > 0 THEN
    RAISE WARNING 'Tables without RLS: %', tables_without_rls;
  ELSE
    RAISE NOTICE 'All critical tables have RLS enabled ✓';
  END IF;
END $$;
