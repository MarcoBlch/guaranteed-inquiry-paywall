-- ============================================================================
-- Migration: Fix SECURITY DEFINER Functions - Search Path Vulnerability
-- Date: 2026-02-03
-- Issue: Functions without SET search_path are vulnerable to schema poisoning
-- Risk: CRITICAL - is_admin() used in 20+ RLS policies across system
-- ============================================================================

-- ===========================================
-- CRITICAL FIX 1: is_admin() function
-- Used by RLS policies on 8+ tables
-- ===========================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT is_admin FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = '';

COMMENT ON FUNCTION public.is_admin IS 'SECURITY FIX: Added search_path protection against schema poisoning. Used by RLS policies system-wide.';

-- ===========================================
-- CRITICAL FIX 2: create_user_invite_codes()
-- Creates invite codes with elevated privileges
-- ===========================================

CREATE OR REPLACE FUNCTION public.create_user_invite_codes(p_user_id UUID)
RETURNS SETOF public.invite_codes AS $$
DECLARE
  new_code VARCHAR;
  code_record public.invite_codes;
BEGIN
  FOR i IN 1..3 LOOP
    -- Generate code using public schema
    new_code := public.generate_invite_code('FP');

    -- Insert into invite_codes (explicit schema qualification)
    INSERT INTO public.invite_codes (code, code_type, created_by_user_id)
    VALUES (new_code, 'referral', p_user_id)
    RETURNING * INTO code_record;

    RETURN NEXT code_record;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMENT ON FUNCTION public.create_user_invite_codes IS 'SECURITY FIX: Added search_path protection. Creates 3 referral invite codes for a user.';

-- ===========================================
-- CRITICAL FIX 3: check_and_update_referrer_bonus()
-- Trigger function that updates user_tiers
-- ===========================================

CREATE OR REPLACE FUNCTION public.check_and_update_referrer_bonus()
RETURNS TRIGGER AS $$
DECLARE
  referrer_id UUID;
  completed_referrals INTEGER;
BEGIN
  -- Only trigger when Stripe onboarding is completed for the first time
  IF NEW.stripe_onboarding_completed = true AND
     (OLD.stripe_onboarding_completed IS NULL OR OLD.stripe_onboarding_completed = false) THEN

    -- Find who referred this user (explicit schema)
    SELECT ic.created_by_user_id INTO referrer_id
    FROM public.invite_codes ic
    WHERE ic.used_by_user_id = NEW.id;

    IF referrer_id IS NOT NULL THEN
      -- Count completed referrals (explicit schema)
      SELECT COUNT(*) INTO completed_referrals
      FROM public.invite_codes ic
      JOIN public.profiles p ON p.id = ic.used_by_user_id
      WHERE ic.created_by_user_id = referrer_id
        AND p.stripe_onboarding_completed = true;

      -- Update user tier based on referrals (explicit schema)
      IF completed_referrals >= 10 THEN
        UPDATE public.user_tiers
        SET tier = 'platinum', revenue_percentage = 0.90
        WHERE user_id = referrer_id;

        INSERT INTO public.admin_actions (action_type, performed_by, target_user_id, details)
        VALUES ('tier_upgrade', referrer_id, referrer_id, 'Auto-upgraded to platinum (10+ referrals)');

      ELSIF completed_referrals >= 5 THEN
        UPDATE public.user_tiers
        SET tier = 'gold', revenue_percentage = 0.85
        WHERE user_id = referrer_id;

        INSERT INTO public.admin_actions (action_type, performed_by, target_user_id, details)
        VALUES ('tier_upgrade', referrer_id, referrer_id, 'Auto-upgraded to gold (5+ referrals)');

      ELSIF completed_referrals >= 2 THEN
        UPDATE public.user_tiers
        SET tier = 'silver', revenue_percentage = 0.80
        WHERE user_id = referrer_id;

        INSERT INTO public.admin_actions (action_type, performed_by, target_user_id, details)
        VALUES ('tier_upgrade', referrer_id, referrer_id, 'Auto-upgraded to silver (2+ referrals)');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMENT ON FUNCTION public.check_and_update_referrer_bonus IS 'SECURITY FIX: Added search_path protection. Updates referrer tier when invitee completes Stripe onboarding.';

-- ===========================================
-- CRITICAL FIX 4: create_user_tier_on_signup()
-- Trigger function that initializes user tier
-- ===========================================

CREATE OR REPLACE FUNCTION public.create_user_tier_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_tiers (user_id, tier, revenue_percentage)
  VALUES (NEW.id, 'standard', 0.75)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMENT ON FUNCTION public.create_user_tier_on_signup IS 'SECURITY FIX: Added search_path protection. Creates standard tier for new users.';

-- ===========================================
-- MEDIUM PRIORITY FIXES: Utility Functions
-- These don't have SECURITY DEFINER but should have search_path
-- ===========================================

CREATE OR REPLACE FUNCTION public.update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM webhook_events
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invite_code(prefix VARCHAR DEFAULT 'FP')
RETURNS VARCHAR AS $$
DECLARE
  random_suffix VARCHAR;
  candidate_code VARCHAR;
  code_exists BOOLEAN;
BEGIN
  LOOP
    random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    candidate_code := prefix || '-' || random_suffix;

    SELECT EXISTS(SELECT 1 FROM invite_codes WHERE code = candidate_code) INTO code_exists;

    IF NOT code_exists THEN
      RETURN candidate_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.is_invite_only_enabled()
RETURNS BOOLEAN AS $$
DECLARE
  setting_value BOOLEAN;
BEGIN
  SELECT invite_only_mode INTO setting_value
  FROM platform_settings
  WHERE id = 1;

  RETURN COALESCE(setting_value, false);
END;
$$ LANGUAGE plpgsql STABLE SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.get_user_revenue_percentage(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  revenue_pct DECIMAL;
BEGIN
  SELECT revenue_percentage INTO revenue_pct
  FROM user_tiers
  WHERE user_id = p_user_id;

  RETURN COALESCE(revenue_pct, 0.75);
END;
$$ LANGUAGE plpgsql STABLE SET search_path = 'public';

-- ===========================================
-- Verification Query
-- ===========================================

-- Run this query after migration to verify all SECURITY DEFINER functions have search_path:
-- SELECT proname, prosecdef, prosrc FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace AND prosecdef = true;
