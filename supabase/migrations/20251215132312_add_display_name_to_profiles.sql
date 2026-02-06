-- Add display_name column to profiles table
-- This allows users to have a public-facing name while keeping their email private

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.display_name IS 'Public display name shown on payment pages (NOT email address - preserves privacy)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);
