-- Add stripe_transfer_id to track successful Stripe transfers
-- This is critical for reconciliation when DB update fails after transfer succeeds

ALTER TABLE escrow_transactions
ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_stripe_transfer_id
ON escrow_transactions(stripe_transfer_id);

-- Add comment
COMMENT ON COLUMN escrow_transactions.stripe_transfer_id IS
'Stripe Transfer ID (tr_xxx) for recipient payout. Set when transfer succeeds, used for reconciliation if DB update fails.';
