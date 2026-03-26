-- Migration: Add slug column to profiles for short profile URLs
-- Enables: fastpass.email/marcb instead of fastpass.email/pay/{uuid}

-- Step 1: Add nullable slug column
ALTER TABLE public.profiles ADD COLUMN slug VARCHAR(30);

-- Step 2: Add CHECK constraint for format validation
-- Rules: lowercase alphanumeric + hyphens, cannot start/end with hyphen, 3-30 chars
ALTER TABLE public.profiles ADD CONSTRAINT profiles_slug_format
  CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND length(slug) >= 3 AND length(slug) <= 30);

-- Step 3: Create unique index (partial, only for non-null slugs during migration)
CREATE UNIQUE INDEX idx_profiles_slug ON public.profiles(slug) WHERE slug IS NOT NULL;

-- Step 4: Create slug generation function
CREATE OR REPLACE FUNCTION public.generate_profile_slug(p_display_name TEXT, p_user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  suffix INT := 0;
  reserved_slugs TEXT[] := ARRAY[
    'pay', 'payment', 'payment-success', 'dashboard', 'settings',
    'auth', 'directory', 'privacy', 'terms', 'cookie-settings', 'faq',
    'blog', 'rate', 'admin-setup', 'admin', 'email-preview', 'email-test',
    'api', 'sitemap', 'solution-unsolicited-dm',
    'login', 'signup', 'register', 'logout',
    'about', 'contact', 'help', 'support', 'pricing', 'features',
    'fastpass', 'root', 'system', 'stripe', 'postmark'
  ];
BEGIN
  -- Normalize display_name to a URL-safe slug
  IF p_display_name IS NOT NULL AND trim(p_display_name) != '' THEN
    base_slug := lower(trim(p_display_name));
    -- Replace common accented characters
    base_slug := translate(base_slug,
      'àáâãäåèéêëìíîïòóôõöùúûüýñç',
      'aaaaaaeeeeiiiioooooouuuuync');
    -- Replace spaces, underscores, dots with hyphens
    base_slug := regexp_replace(base_slug, '[\s_\.]+', '-', 'g');
    -- Remove all characters that are not lowercase alphanumeric or hyphens
    base_slug := regexp_replace(base_slug, '[^a-z0-9-]', '', 'g');
    -- Collapse multiple hyphens
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    -- Trim leading/trailing hyphens
    base_slug := trim(both '-' from base_slug);
  END IF;

  -- Fallback if display_name produced nothing useful
  IF base_slug IS NULL OR length(base_slug) < 3 THEN
    base_slug := 'user-' || substr(p_user_uuid::text, 1, 8);
  END IF;

  -- Truncate to max 30 chars (leaving room for collision suffixes)
  IF length(base_slug) > 26 THEN
    base_slug := substr(base_slug, 1, 26);
    -- Ensure we don't end on a hyphen after truncation
    base_slug := trim(trailing '-' from base_slug);
  END IF;

  -- Ensure minimum length after all processing
  IF length(base_slug) < 3 THEN
    base_slug := 'user-' || substr(p_user_uuid::text, 1, 8);
  END IF;

  candidate := base_slug;

  -- Check reserved slugs and uniqueness, append suffix if needed
  LOOP
    -- Skip reserved slugs
    IF candidate = ANY(reserved_slugs) THEN
      suffix := suffix + 1;
      candidate := base_slug || '-' || suffix;
      CONTINUE;
    END IF;

    -- Check if slug is already taken (by a different user)
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE slug = candidate AND id != p_user_uuid
    ) THEN
      RETURN candidate;
    END IF;

    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix;

    -- Safety valve: prevent infinite loop
    IF suffix > 100 THEN
      RETURN 'user-' || substr(p_user_uuid::text, 1, 8);
    END IF;
  END LOOP;
END;
$$;

-- Step 5: Backfill existing profiles with auto-generated slugs
DO $$
DECLARE
  rec RECORD;
  new_slug TEXT;
BEGIN
  FOR rec IN SELECT id, display_name FROM public.profiles WHERE slug IS NULL ORDER BY created_at ASC LOOP
    SELECT public.generate_profile_slug(rec.display_name, rec.id) INTO new_slug;
    UPDATE public.profiles SET slug = new_slug WHERE id = rec.id;
  END LOOP;
END $$;

-- Step 6: Make slug NOT NULL after backfill
ALTER TABLE public.profiles ALTER COLUMN slug SET NOT NULL;

-- Step 7: Replace partial index with full unique index (now that all rows have slugs)
DROP INDEX IF EXISTS idx_profiles_slug;
CREATE UNIQUE INDEX idx_profiles_slug ON public.profiles(slug);

-- Step 8: Create trigger to auto-generate slug on new profile creation
CREATE OR REPLACE FUNCTION public.auto_generate_slug_on_profile_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    BEGIN
      NEW.slug := public.generate_profile_slug(NEW.display_name, NEW.id);
    EXCEPTION WHEN OTHERS THEN
      -- Fallback: use UUID prefix if slug generation fails
      -- This ensures signup is never blocked by slug generation
      NEW.slug := 'user-' || substr(NEW.id::text, 1, 8);
      RAISE WARNING 'auto_generate_slug failed for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_generate_slug
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_slug_on_profile_create();
