-- ============================================================================
-- FIX: admin_actions table schema issues (FINAL VERSION)
-- Issue: Code inserts description/metadata columns that don't exist
-- Issue: CHECK constraint rejects valid action_type values
-- Affected: supabase/functions/check-escrow-timeouts/index.ts lines 53-59, 131-137
-- ============================================================================

-- Add missing columns
ALTER TABLE public.admin_actions
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Update CHECK constraint to include all used action_type values
ALTER TABLE public.admin_actions
DROP CONSTRAINT IF EXISTS admin_actions_action_type_check;

ALTER TABLE public.admin_actions
ADD CONSTRAINT admin_actions_action_type_check
CHECK (action_type IN (
  'validate_response',
  'reject_response',
  'refund_manual',
  'release_manual',
  'circuit_breaker_triggered',  -- Used in check-escrow-timeouts:53
  'refund_limit_reached'          -- Used in check-escrow-timeouts:131
));

-- Add index for metadata queries
CREATE INDEX IF NOT EXISTS idx_admin_actions_metadata
ON public.admin_actions USING gin(metadata);

-- Add comments
COMMENT ON COLUMN public.admin_actions.description IS 'Human-readable description of the action';
COMMENT ON COLUMN public.admin_actions.metadata IS 'Additional structured data about the action';
