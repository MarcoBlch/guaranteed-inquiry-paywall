-- Migration: Create trigger to link auth.users to profiles
--
-- This migration fixes the "database error saving new user" bug by creating
-- the missing trigger that connects auth.users INSERT events to the
-- existing handle_new_user() function.
--
-- The trigger chain after this fix:
--   1. auth.users INSERT → on_auth_user_created trigger → handle_new_user()
--   2. profiles INSERT → trigger_create_user_tier → create_user_tier_on_signup()
--   3. profiles INSERT → trigger_auto_generate_referral_codes → auto_generate_referral_codes_on_signup()

-- Drop the trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create profile on user signup
-- Note: Cannot add COMMENT due to auth.users ownership restrictions
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
