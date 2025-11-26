-- ============================================================================
-- FIX: email_logs table schema issues
-- Issue: TypeScript types expect columns that don't exist in database
-- Affected: src/integrations/supabase/types.ts lines 92, 100
-- ============================================================================

-- Add missing columns
ALTER TABLE public.email_logs
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_email_logs_updated_at ON public.email_logs;
CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index for failure tracking
CREATE INDEX IF NOT EXISTS idx_email_logs_failed
ON public.email_logs(failed_at, failure_reason)
WHERE failed_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.email_logs.failure_reason IS 'Reason for email failure if failed_at is set';
COMMENT ON COLUMN public.email_logs.updated_at IS 'Last update timestamp (auto-managed by trigger)';
