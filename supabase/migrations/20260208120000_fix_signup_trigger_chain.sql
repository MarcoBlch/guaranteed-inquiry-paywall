-- ============================================================================
-- Migration: Fix Signup Trigger Chain & Latent Bugs
-- Date: 2026-02-08
--
-- This migration fixes 6 issues discovered during investigation of the
-- "database error saving new user" error on Google OAuth signup:
--
--   CRITICAL:
--     A. Ensure on_auth_user_created trigger exists (may not be in production)
--     B. Fix auto_generate_referral_codes_on_signup() - add search_path + exception handling
--     C. (handled by B) Make trigger chain resilient - invite code failure must not block signup
--
--   MEDIUM:
--     D. Fix user_tiers CHECK constraint - add 'silver', 'gold', 'platinum' tiers
--     E. Fix admin_actions CHECK constraint - add 'tier_upgrade'
--     F. Fix check_and_update_referrer_bonus() - correct column names for admin_actions
--
--   LOW:
--     G. Fix is_invite_only_enabled() - restore correct query (broken by security fix)
--
--   CLEANUP:
--     H. Fix stuck user anteuryanis@gmail.com if they have partial state
-- ============================================================================


-- ============================================================================
-- PART A: Ensure auth.users trigger exists (idempotent)
-- Without this trigger, no profile is created on signup → auth fails
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- PART B: Fix auto_generate_referral_codes_on_signup()
-- Issues: Missing SET search_path, no exception handling
-- If this function throws, the ENTIRE signup transaction rolls back
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_generate_referral_codes_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_code_limit INTEGER;
  v_generated_code TEXT;
  i INTEGER;
BEGIN
  -- Wrap in exception handler: invite code generation must NEVER block signup
  BEGIN
    -- Get user's invite code limit from user_tiers (default 3)
    SELECT invite_codes_limit INTO v_code_limit
    FROM public.user_tiers
    WHERE user_id = NEW.id;

    -- If no tier record exists yet, use default of 3
    -- This handles the race condition with create_user_tier_on_signup trigger
    IF v_code_limit IS NULL THEN
      v_code_limit := 3;
    END IF;

    -- Generate referral codes
    FOR i IN 1..v_code_limit LOOP
      SELECT public.generate_invite_code('FP') INTO v_generated_code;

      INSERT INTO public.invite_codes (
        code,
        code_type,
        created_by_user_id,
        is_active,
        metadata
      ) VALUES (
        v_generated_code,
        'referral',
        NEW.id,
        true,
        jsonb_build_object(
          'auto_generated', true,
          'generated_at', now()
        )
      );
    END LOOP;

  EXCEPTION WHEN OTHERS THEN
    -- Log the error but DO NOT propagate — signup must succeed
    RAISE WARNING 'auto_generate_referral_codes_on_signup failed for user %: % (SQLSTATE: %)',
      NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

COMMENT ON FUNCTION public.auto_generate_referral_codes_on_signup IS
  'Generates referral invite codes on profile creation. Wrapped in exception handler so failures never block signup.';


-- ============================================================================
-- PART C: Fix user_tiers CHECK constraint
-- The check_and_update_referrer_bonus() function sets tier to 'silver',
-- 'gold', 'platinum' but these are not in the original CHECK constraint
-- ============================================================================

ALTER TABLE public.user_tiers
  DROP CONSTRAINT IF EXISTS user_tiers_tier_check;

ALTER TABLE public.user_tiers
  ADD CONSTRAINT user_tiers_tier_check
  CHECK (tier IN ('founder', 'early_adopter', 'standard', 'silver', 'gold', 'platinum'));


-- ============================================================================
-- PART D: Fix admin_actions CHECK constraint
-- Add 'tier_upgrade' which is used by check_and_update_referrer_bonus()
-- ============================================================================

ALTER TABLE public.admin_actions
  DROP CONSTRAINT IF EXISTS admin_actions_action_type_check;

ALTER TABLE public.admin_actions
  ADD CONSTRAINT admin_actions_action_type_check
  CHECK (action_type IN (
    'validate_response',
    'reject_response',
    'refund_manual',
    'release_manual',
    'circuit_breaker_triggered',
    'refund_limit_reached',
    'tier_upgrade'
  ));


-- ============================================================================
-- PART E: Fix check_and_update_referrer_bonus()
-- Issues:
--   - Used 'performed_by' → should be 'admin_user_id'
--   - Used 'details' → should be 'metadata'
--   - Used 'target_user_id' → column doesn't exist
--   - Preserved: SECURITY DEFINER SET search_path = ''
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_and_update_referrer_bonus()
RETURNS TRIGGER AS $$
DECLARE
  referrer_id UUID;
  completed_referrals INTEGER;
BEGIN
  -- Only trigger when Stripe onboarding is completed for the first time
  IF NEW.stripe_onboarding_completed = true AND
     (OLD.stripe_onboarding_completed IS NULL OR OLD.stripe_onboarding_completed = false) THEN

    -- Find who referred this user (via invite code)
    SELECT ic.created_by_user_id INTO referrer_id
    FROM public.invite_codes ic
    WHERE ic.used_by_user_id = NEW.id;

    IF referrer_id IS NOT NULL THEN
      -- Count how many of referrer's invitees have completed Stripe setup
      SELECT COUNT(*) INTO completed_referrals
      FROM public.invite_codes ic
      JOIN public.profiles p ON p.id = ic.used_by_user_id
      WHERE ic.created_by_user_id = referrer_id
        AND p.stripe_onboarding_completed = true;

      -- Update referrer's referral count
      UPDATE public.user_tiers
      SET
        referral_count = completed_referrals,
        updated_at = now()
      WHERE user_id = referrer_id;

      -- Auto-upgrade tiers based on completed referrals
      IF completed_referrals >= 10 THEN
        UPDATE public.user_tiers
        SET tier = 'platinum', revenue_percentage = 0.90,
            tier_reason = 'Auto-upgraded: 10+ referrals',
            tier_granted_at = now(), updated_at = now()
        WHERE user_id = referrer_id;

        INSERT INTO public.admin_actions (admin_user_id, action_type, description, metadata)
        VALUES (referrer_id, 'tier_upgrade', 'Auto-upgraded to platinum (10+ referrals)',
          jsonb_build_object('referrer_id', referrer_id, 'referral_count', completed_referrals, 'new_tier', 'platinum'));

      ELSIF completed_referrals >= 5 THEN
        UPDATE public.user_tiers
        SET tier = 'gold', revenue_percentage = 0.85,
            tier_reason = 'Auto-upgraded: 5+ referrals',
            tier_granted_at = now(), updated_at = now()
        WHERE user_id = referrer_id;

        INSERT INTO public.admin_actions (admin_user_id, action_type, description, metadata)
        VALUES (referrer_id, 'tier_upgrade', 'Auto-upgraded to gold (5+ referrals)',
          jsonb_build_object('referrer_id', referrer_id, 'referral_count', completed_referrals, 'new_tier', 'gold'));

      ELSIF completed_referrals >= 2 THEN
        UPDATE public.user_tiers
        SET tier = 'silver', revenue_percentage = 0.80,
            tier_reason = 'Auto-upgraded: 2+ referrals',
            tier_granted_at = now(), updated_at = now()
        WHERE user_id = referrer_id;

        INSERT INTO public.admin_actions (admin_user_id, action_type, description, metadata)
        VALUES (referrer_id, 'tier_upgrade', 'Auto-upgraded to silver (2+ referrals)',
          jsonb_build_object('referrer_id', referrer_id, 'referral_count', completed_referrals, 'new_tier', 'silver'));
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMENT ON FUNCTION public.check_and_update_referrer_bonus IS
  'Updates referrer tier when invitee completes Stripe onboarding. Fixed column names for admin_actions.';


-- ============================================================================
-- PART F: Fix is_invite_only_enabled()
-- The security fix (20260203) overwrote this with a broken query that
-- references non-existent columns (invite_only_mode, id=1).
-- Restore correct logic using setting_key/setting_value columns.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_invite_only_enabled()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT (setting_value->>'enabled')::boolean
     FROM public.platform_settings
     WHERE setting_key = 'invite_only_mode'),
    true  -- Default to invite-only if setting not found
  );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = 'public';

COMMENT ON FUNCTION public.is_invite_only_enabled IS
  'Returns true if invite-only mode is enabled. Fixed: restored correct column references.';


-- ============================================================================
-- PART G: Cleanup stuck user anteuryanis@gmail.com
-- If they have an auth.users entry but no profile, create missing records
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_generated_code TEXT;
BEGIN
  -- Find the stuck user
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'anteuryanis@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User anteuryanis@gmail.com not found in auth.users — they can retry signup normally';
    RETURN;
  END IF;

  -- Create profile if missing
  INSERT INTO public.profiles (id)
  VALUES (v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- Create user_tier if missing
  INSERT INTO public.user_tiers (user_id, tier, revenue_percentage)
  VALUES (v_user_id, 'standard', 0.75)
  ON CONFLICT (user_id) DO NOTHING;

  -- Generate invite codes if missing
  IF NOT EXISTS (
    SELECT 1 FROM public.invite_codes
    WHERE created_by_user_id = v_user_id AND code_type = 'referral'
  ) THEN
    FOR i IN 1..3 LOOP
      SELECT public.generate_invite_code('FP') INTO v_generated_code;

      INSERT INTO public.invite_codes (code, code_type, created_by_user_id, is_active, metadata)
      VALUES (
        v_generated_code,
        'referral',
        v_user_id,
        true,
        jsonb_build_object('manual_fix', true, 'fixed_at', now())
      );
    END LOOP;
  END IF;

  RAISE NOTICE 'Fixed user % (anteuryanis@gmail.com)', v_user_id;
END $$;
