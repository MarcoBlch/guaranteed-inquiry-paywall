-- Add missing status values to escrow_transactions status check constraint
-- This fixes the issue where distribute-escrow-funds tries to use 'processing',
-- 'pending_user_setup', and 'transfer_failed' statuses that weren't in the original constraint

-- Drop the existing constraint
ALTER TABLE escrow_transactions
DROP CONSTRAINT IF EXISTS escrow_transactions_status_check;

-- Add the updated constraint with all status values used by the code
ALTER TABLE escrow_transactions
ADD CONSTRAINT escrow_transactions_status_check
CHECK (status IN (
  'pending',            -- Initial state (not currently used)
  'held',               -- Funds held in escrow, awaiting response
  'processing',         -- Being processed by distribute-escrow-funds (atomic lock)
  'released',           -- Funds distributed to recipient
  'refunded',           -- No response, funds refunded to sender
  'failed',             -- Payment failed
  'pending_user_setup', -- Response received but recipient hasn't configured Stripe
  'transfer_failed'     -- Stripe transfer to recipient failed (needs retry)
));

-- Add helpful comment
COMMENT ON COLUMN escrow_transactions.status IS
'Transaction status: pending (initial), held (awaiting response), processing (being distributed), released (paid out), refunded (no response), failed (payment error), pending_user_setup (needs Stripe setup), transfer_failed (retry needed)';
