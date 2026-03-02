-- Prevent duplicate deadline reminder emails at the database level.
-- A partial unique index on (message_id, reminder_number) for deadline_reminder rows
-- ensures that even if application code has bugs, the DB will reject duplicate inserts.
-- This is a safety net: the primary fix is in the send-deadline-reminders Edge Function.

CREATE UNIQUE INDEX IF NOT EXISTS email_logs_unique_deadline_reminder
  ON public.email_logs (message_id, (metadata->>'reminder_number'))
  WHERE email_type = 'deadline_reminder';
