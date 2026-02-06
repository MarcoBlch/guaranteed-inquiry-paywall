-- Migration: Add webhook_events table for idempotency
-- This table tracks processed Stripe webhook events to prevent duplicate processing

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by event_id
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);

-- Index for cleanup queries (optional - for future maintenance)
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

-- Add comment for documentation
COMMENT ON TABLE webhook_events IS 'Tracks processed Stripe webhook events to prevent duplicate processing (idempotency)';
COMMENT ON COLUMN webhook_events.event_id IS 'Stripe event ID (evt_...)';
COMMENT ON COLUMN webhook_events.event_type IS 'Stripe event type (e.g., payment_intent.succeeded)';
COMMENT ON COLUMN webhook_events.processed_at IS 'When we finished processing this event';
COMMENT ON COLUMN webhook_events.created_at IS 'When this record was created';

-- Optional: Add a cleanup function to delete old events after 90 days
-- This prevents the table from growing indefinitely
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM webhook_events
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Optional: Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-webhook-events', '0 2 * * 0', 'SELECT cleanup_old_webhook_events()');
