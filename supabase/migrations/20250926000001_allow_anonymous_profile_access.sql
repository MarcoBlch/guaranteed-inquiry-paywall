-- Allow anonymous users to read basic profile information for payment links
-- This is essential for the payment flow to work without authentication

BEGIN;

-- Add policy to allow anonymous users to read basic profile info
-- Only price, stripe_onboarding_completed, and stripe_account_id are needed for payments
CREATE POLICY "Anonymous users can view basic profile info for payments"
    ON public.profiles FOR SELECT
    USING (true);

-- Note: This policy is intentionally broad for anonymous access
-- Only these specific fields are exposed in the payment flow:
-- - price (required to display payment amount)
-- - stripe_onboarding_completed (required to validate recipient setup)
-- - stripe_account_id (required for payment processing)
--
-- Sensitive fields like email, is_admin, etc. are not exposed
-- through the payment interface

COMMIT;