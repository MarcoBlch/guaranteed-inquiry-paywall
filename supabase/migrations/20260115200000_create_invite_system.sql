-- ============================================================================
-- INVITE SYSTEM FOR FASTPASS BETA LAUNCH
-- ============================================================================
-- This migration creates the invite code system with:
-- - invite_codes table for tracking codes
-- - platform_settings table for global settings (including kill switch)
-- - user_tiers table for per-user revenue percentages
-- - Functions for code generation and validation
-- - Triggers for automatic tier upgrades
-- ============================================================================

-- ============================================================================
-- TABLE 1: invite_codes
-- Tracks all invite codes (founder codes + referral codes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  code_type VARCHAR(20) NOT NULL CHECK (code_type IN ('founder', 'referral')),
  created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  used_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON public.invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON public.invite_codes(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_used_by ON public.invite_codes(used_by_user_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_is_active ON public.invite_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code_type ON public.invite_codes(code_type);

-- Comments
COMMENT ON TABLE public.invite_codes IS 'Tracks invite codes for beta launch - founder codes and referral codes';
COMMENT ON COLUMN public.invite_codes.code_type IS 'Type of code: founder (initial 20) or referral (user-generated)';
COMMENT ON COLUMN public.invite_codes.is_active IS 'Whether the code can still be used (false if revoked)';

-- ============================================================================
-- TABLE 2: platform_settings
-- Global settings including invite-only mode (kill switch)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES
  ('invite_only_mode', '{"enabled": true}'::jsonb, 'When enabled, signup requires a valid invite code'),
  ('default_revenue_split', '{"recipient_percentage": 0.75}'::jsonb, 'Default revenue split for regular users (75%)'),
  ('early_adopter_revenue_split', '{"recipient_percentage": 0.85}'::jsonb, 'Revenue split for users with 3+ referrals (85%)')
ON CONFLICT (setting_key) DO NOTHING;

COMMENT ON TABLE public.platform_settings IS 'Global platform settings including invite-only mode toggle';

-- ============================================================================
-- TABLE 3: user_tiers
-- Per-user revenue percentage tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (tier IN ('founder', 'early_adopter', 'standard')),
  revenue_percentage DECIMAL(4,2) NOT NULL DEFAULT 0.75 CHECK (revenue_percentage >= 0.50 AND revenue_percentage <= 0.95),
  invite_codes_limit INTEGER NOT NULL DEFAULT 3,
  referral_count INTEGER NOT NULL DEFAULT 0,
  tier_reason TEXT,
  tier_granted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_tiers_user_id ON public.user_tiers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tiers_tier ON public.user_tiers(tier);

COMMENT ON TABLE public.user_tiers IS 'Tracks user tier and revenue percentage (75% standard, 85% early adopter)';
COMMENT ON COLUMN public.user_tiers.referral_count IS 'Count of invitees who completed Stripe onboarding';

-- ============================================================================
-- MODIFY PROFILES TABLE
-- Add invite tracking columns
-- ============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS invited_by_code UUID REFERENCES public.invite_codes(id),
ADD COLUMN IF NOT EXISTS signed_up_at TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN public.profiles.invited_by_code IS 'The invite code used during signup (if any)';

-- ============================================================================
-- FUNCTION: generate_invite_code
-- Generates a unique invite code with format PREFIX-XXXXXXXX
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_invite_code(prefix VARCHAR DEFAULT 'FP')
RETURNS VARCHAR AS $$
DECLARE
  chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Avoid confusing chars like 0/O, 1/I
  result VARCHAR;
  i INTEGER;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  LOOP
    result := prefix || '-';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM public.invite_codes WHERE code = result) THEN
      RETURN result;
    END IF;

    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique invite code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_invite_code IS 'Generates a unique invite code with format PREFIX-XXXXXXXX';

-- ============================================================================
-- FUNCTION: is_invite_only_enabled
-- Checks if invite-only mode is enabled
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_invite_only_enabled()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT (setting_value->>'enabled')::boolean
     FROM public.platform_settings
     WHERE setting_key = 'invite_only_mode'),
    true -- Default to invite-only if setting not found
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.is_invite_only_enabled IS 'Returns true if invite-only mode is enabled';

-- ============================================================================
-- FUNCTION: get_user_revenue_percentage
-- Gets a user's revenue percentage (defaults to 75%)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_revenue_percentage(p_user_id UUID)
RETURNS DECIMAL AS $$
BEGIN
  RETURN COALESCE(
    (SELECT revenue_percentage FROM public.user_tiers WHERE user_id = p_user_id),
    0.75 -- Default 75% if no tier record exists
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_user_revenue_percentage IS 'Returns user revenue percentage (0.75 or 0.85)';

-- ============================================================================
-- FUNCTION: create_user_invite_codes
-- Creates 3 referral codes for a new user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_user_invite_codes(p_user_id UUID)
RETURNS SETOF public.invite_codes AS $$
DECLARE
  new_code VARCHAR;
  i INTEGER;
BEGIN
  FOR i IN 1..3 LOOP
    new_code := public.generate_invite_code('FP');

    INSERT INTO public.invite_codes (code, code_type, created_by_user_id)
    VALUES (new_code, 'referral', p_user_id)
    RETURNING * INTO new_code;

    RETURN NEXT (
      SELECT * FROM public.invite_codes WHERE code = new_code
    );
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_user_invite_codes IS 'Creates 3 referral invite codes for a user';

-- ============================================================================
-- TRIGGER FUNCTION: check_and_update_referrer_bonus
-- Updates referrer stats when invitee completes Stripe onboarding
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

      -- Auto-upgrade to early_adopter at 3 completed referrals
      IF completed_referrals >= 3 THEN
        UPDATE public.user_tiers
        SET
          tier = 'early_adopter',
          revenue_percentage = 0.85,
          tier_reason = 'Reached 3 successful referrals (Stripe-verified)',
          tier_granted_at = now(),
          updated_at = now()
        WHERE user_id = referrer_id
          AND tier = 'standard';

        -- Log the upgrade in admin_actions for audit
        INSERT INTO public.admin_actions (admin_user_id, action_type, description, metadata)
        VALUES (
          referrer_id,
          'tier_upgrade',
          'User upgraded to early_adopter tier (85% revenue share)',
          jsonb_build_object(
            'referrer_id', referrer_id,
            'new_tier', 'early_adopter',
            'referral_count', completed_referrals,
            'triggered_by_user', NEW.id
          )
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on profiles table
DROP TRIGGER IF EXISTS trigger_check_referrer_bonus ON public.profiles;
CREATE TRIGGER trigger_check_referrer_bonus
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_and_update_referrer_bonus();

COMMENT ON FUNCTION public.check_and_update_referrer_bonus IS 'Updates referrer tier when invitee completes Stripe onboarding';

-- ============================================================================
-- TRIGGER FUNCTION: create_user_tier_on_signup
-- Creates a user_tiers record when a new user signs up
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_user_tier_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default user_tier record
  INSERT INTO public.user_tiers (user_id, tier, revenue_percentage)
  VALUES (NEW.id, 'standard', 0.75)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on profiles table (after insert)
DROP TRIGGER IF EXISTS trigger_create_user_tier ON public.profiles;
CREATE TRIGGER trigger_create_user_tier
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_user_tier_on_signup();

COMMENT ON FUNCTION public.create_user_tier_on_signup IS 'Creates default user_tier record when user signs up';

-- ============================================================================
-- ROW LEVEL SECURITY: invite_codes
-- ============================================================================

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own created codes
CREATE POLICY "Users can view own created codes"
  ON public.invite_codes FOR SELECT
  USING (auth.uid() = created_by_user_id);

-- Users can view codes they used
CREATE POLICY "Users can view codes they used"
  ON public.invite_codes FOR SELECT
  USING (auth.uid() = used_by_user_id);

-- Admins can view all codes
CREATE POLICY "Admins can view all invite codes"
  ON public.invite_codes FOR SELECT
  USING (public.is_admin());

-- Admins can insert codes (for founder code generation)
CREATE POLICY "Admins can insert invite codes"
  ON public.invite_codes FOR INSERT
  WITH CHECK (public.is_admin());

-- System can insert codes (via security definer functions)
CREATE POLICY "System can insert codes via functions"
  ON public.invite_codes FOR INSERT
  WITH CHECK (true);

-- Admins can update codes (revoke, etc.)
CREATE POLICY "Admins can update invite codes"
  ON public.invite_codes FOR UPDATE
  USING (public.is_admin());

-- System can update codes (mark as used)
CREATE POLICY "System can update codes"
  ON public.invite_codes FOR UPDATE
  USING (true);

-- ============================================================================
-- ROW LEVEL SECURITY: platform_settings
-- ============================================================================

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read platform settings (needed for signup flow)
CREATE POLICY "Anyone can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  USING (public.is_admin());

-- Only admins can insert settings
CREATE POLICY "Admins can insert platform settings"
  ON public.platform_settings FOR INSERT
  WITH CHECK (public.is_admin());

-- ============================================================================
-- ROW LEVEL SECURITY: user_tiers
-- ============================================================================

ALTER TABLE public.user_tiers ENABLE ROW LEVEL SECURITY;

-- Users can view their own tier
CREATE POLICY "Users can view own tier"
  ON public.user_tiers FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all tiers
CREATE POLICY "Admins can view all user tiers"
  ON public.user_tiers FOR SELECT
  USING (public.is_admin());

-- Admins can update tiers
CREATE POLICY "Admins can update user tiers"
  ON public.user_tiers FOR UPDATE
  USING (public.is_admin());

-- System can insert/update tiers (via triggers)
CREATE POLICY "System can manage user tiers"
  ON public.user_tiers FOR ALL
  USING (true);

-- ============================================================================
-- BACKFILL: Create user_tiers for existing users
-- ============================================================================

INSERT INTO public.user_tiers (user_id, tier, revenue_percentage, tier_reason)
SELECT
  id,
  CASE WHEN is_admin THEN 'founder' ELSE 'standard' END,
  0.75,
  'Existing user - backfilled during invite system migration'
FROM public.profiles
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_tiers WHERE user_tiers.user_id = profiles.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on tables to authenticated users
GRANT SELECT ON public.invite_codes TO authenticated;
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT SELECT ON public.user_tiers TO authenticated;

-- Grant usage on tables to anon (for signup flow)
GRANT SELECT ON public.platform_settings TO anon;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.generate_invite_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_invite_only_enabled TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_revenue_percentage TO authenticated;
