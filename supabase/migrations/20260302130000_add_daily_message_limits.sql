-- Add per-user daily limit override column to profiles.
-- NULL = use platform default (currently 5). Populated for future premium tiers.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_limit_override INTEGER DEFAULT NULL;

-- Store the configurable default limits in platform_settings.
-- Keyed by user tier; allows raising limits per tier without code changes.
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES (
  'daily_message_limits',
  '{"default": 5, "founder": 100, "early_adopter": 20, "standard": 5}'::jsonb,
  'Max paid messages a receiver can accept per day, by user tier'
) ON CONFLICT (setting_key) DO NOTHING;

-- Compound index for efficient daily message counting per recipient.
-- Used in process-escrow-payment and get-payment-profile.
CREATE INDEX IF NOT EXISTS idx_escrow_recipient_created_at
  ON public.escrow_transactions (recipient_user_id, created_at);
