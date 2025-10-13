-- ═══════════════════════════════════════════════════════════════
-- 🚨 CRITICAL: Check for Stuck Transactions
-- Run this to find transactions that should have been refunded
-- ═══════════════════════════════════════════════════════════════

SELECT
  id,
  status,
  amount,
  created_at,
  expires_at,
  NOW() - expires_at as overdue_by,
  message_id,
  recipient_user_id,
  sender_email,
  stripe_payment_intent_id
FROM escrow_transactions
WHERE status = 'held'
  AND expires_at < NOW() - INTERVAL '20 minutes'  -- Grace period + buffer
ORDER BY expires_at ASC;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Expected Result: 0 rows
-- If any rows appear: Investigate immediately!
-- Possible causes:
--   1. Cron job not running
--   2. Cron job failing
--   3. Stripe API errors
--   4. Database connection issues
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Manual Fix (if needed):
-- 1. Check GitHub Actions: https://github.com/YOUR_REPO/actions
-- 2. Manually trigger timeout check:
--    curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-escrow-timeouts \
--      -H "Authorization: Bearer YOUR_SERVICE_KEY"
-- 3. If Stripe error, manually cancel in Stripe Dashboard
-- 4. Update database: UPDATE escrow_transactions SET status = 'refunded' WHERE id = 'xxx';
