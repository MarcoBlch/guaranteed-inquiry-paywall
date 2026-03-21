-- Add reminder tracking columns directly to escrow_transactions.
--
-- Why: The previous approach stored reminder state in email_logs and counted records
-- to determine whether reminders had been sent. However, email_logs inserts for
-- 'deadline_reminder' have been silently failing (0 records ever created), causing
-- reminderCount to always return 0 and the cron to spam reminders on every run.
--
-- Storing state in the source table (escrow_transactions) is atomic and reliable.
-- The UPDATE operation is a single SQL statement with no external dependency.

ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS reminder_1_sent_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reminder_2_sent_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.escrow_transactions.reminder_1_sent_at IS 'Timestamp when the first deadline reminder (50% mark) was sent to the recipient. NULL = not yet sent.';
COMMENT ON COLUMN public.escrow_transactions.reminder_2_sent_at IS 'Timestamp when the second deadline reminder (75% mark) was sent to the recipient. NULL = not yet sent.';

-- Immediately stop spam for all currently active (held, not yet expired) transactions.
-- Sets reminder_1_sent_at to the halfway point of their deadline window.
-- This marks them as "first reminder already sent" without modifying any email records
-- or deleting any data. Safe for production.
UPDATE public.escrow_transactions
SET reminder_1_sent_at = (created_at + (expires_at - created_at) * 0.5)
WHERE status = 'held'
  AND expires_at > NOW()
  AND (expires_at - created_at) > INTERVAL '0';
