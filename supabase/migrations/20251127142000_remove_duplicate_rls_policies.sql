-- Remove duplicate/conflicting RLS policies
-- These old policies were conflicting with the newer, correct policies

-- Drop old escrow_transactions policies
DROP POLICY IF EXISTS "Users can view escrow transactions" ON escrow_transactions;
DROP POLICY IF EXISTS "Users can view their escrow transactions" ON escrow_transactions;
DROP POLICY IF EXISTS "Response page escrow access" ON escrow_transactions;

-- Drop old messages policies
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Secure response page access" ON messages;

-- Verify we only have the correct policies left
DO $$
DECLARE
  escrow_policies INTEGER;
  message_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO escrow_policies
  FROM pg_policies
  WHERE tablename = 'escrow_transactions' AND cmd = 'SELECT';

  SELECT COUNT(*) INTO message_policies
  FROM pg_policies
  WHERE tablename = 'messages' AND cmd = 'SELECT';

  RAISE NOTICE 'Escrow transactions SELECT policies remaining: %', escrow_policies;
  RAISE NOTICE 'Messages SELECT policies remaining: %', message_policies;

  IF escrow_policies = 1 AND message_policies = 1 THEN
    RAISE NOTICE '✓ Duplicate policies removed successfully!';
  ELSE
    RAISE WARNING 'Expected 1 SELECT policy per table, found % for escrow and % for messages', escrow_policies, message_policies;
  END IF;
END $$;
