-- Remove duplicate RLS policies from message-related tables
-- These duplicate policies are blocking JOIN queries in messages

-- Drop old email_logs policies
DROP POLICY IF EXISTS "Users can view their own email logs" ON email_logs;
DROP POLICY IF EXISTS "Verified admins can view all email logs" ON email_logs;
-- Keep: email_logs_select_policy

-- Drop old message_responses policies
DROP POLICY IF EXISTS "Users can view message responses" ON message_responses;
DROP POLICY IF EXISTS "Verified admins can view message responses" ON message_responses;
-- Keep: responses_select_policy

-- Verify cleanup
DO $$
DECLARE
  email_logs_count INTEGER;
  message_responses_count INTEGER;
  email_response_tracking_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO email_logs_count
  FROM pg_policies
  WHERE tablename = 'email_logs' AND cmd = 'SELECT';

  SELECT COUNT(*) INTO message_responses_count
  FROM pg_policies
  WHERE tablename = 'message_responses' AND cmd = 'SELECT';

  SELECT COUNT(*) INTO email_response_tracking_count
  FROM pg_policies
  WHERE tablename = 'email_response_tracking' AND cmd = 'SELECT';

  RAISE NOTICE 'email_logs SELECT policies: % (expected: 1)', email_logs_count;
  RAISE NOTICE 'message_responses SELECT policies: % (expected: 1)', message_responses_count;
  RAISE NOTICE 'email_response_tracking SELECT policies: % (expected: 1)', email_response_tracking_count;

  IF email_logs_count = 1 AND message_responses_count = 1 AND email_response_tracking_count = 1 THEN
    RAISE NOTICE '✓ All duplicate policies removed! Messages should now work.';
  ELSE
    RAISE WARNING 'Some tables still have multiple policies - JOIN queries may still fail';
  END IF;
END $$;
