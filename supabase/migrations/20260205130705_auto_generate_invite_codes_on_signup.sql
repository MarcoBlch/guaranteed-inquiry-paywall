-- Migration: Auto-generate invite codes on profile creation
-- Purpose: Automatically generate 3 referral codes when a new profile is created
--          and backfill codes for existing profiles that don't have any

-- =============================================================================
-- PART 1: Create Trigger Function
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_generate_referral_codes_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_code_limit INTEGER;
  v_generated_code TEXT;
  i INTEGER;
BEGIN
  -- Get user's invite code limit from user_tiers (default 3)
  SELECT invite_codes_limit INTO v_code_limit
  FROM user_tiers
  WHERE user_id = NEW.id;

  -- If no tier record exists yet, use default of 3
  -- This handles the race condition with create_user_tier_on_signup trigger
  IF v_code_limit IS NULL THEN
    v_code_limit := 3;
  END IF;

  -- Generate referral codes (loop v_code_limit times)
  FOR i IN 1..v_code_limit LOOP
    -- Call existing generate_invite_code function with 'FP' prefix
    SELECT generate_invite_code('FP') INTO v_generated_code;

    -- Insert into invite_codes table
    INSERT INTO invite_codes (
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 2: Create Trigger
-- =============================================================================

-- Drop trigger if it already exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_auto_generate_referral_codes ON profiles;

-- Create trigger that fires AFTER each profile insertion
CREATE TRIGGER trigger_auto_generate_referral_codes
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_codes_on_signup();

-- =============================================================================
-- PART 3: Backfill Existing Profiles
-- =============================================================================

DO $$
DECLARE
  v_profile RECORD;
  v_generated_code TEXT;
  i INTEGER;
  v_total_profiles INTEGER := 0;
  v_backfilled_profiles INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Starting Invite Code Backfill ===';
  RAISE NOTICE 'Timestamp: %', now();

  -- Count total profiles needing backfill
  SELECT COUNT(*) INTO v_total_profiles
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM invite_codes
    WHERE created_by_user_id = p.id
    AND code_type = 'referral'
  );

  RAISE NOTICE 'Found % profiles without referral codes', v_total_profiles;
  RAISE NOTICE '----------------------------------------';

  -- Loop through all profiles that don't have referral codes
  FOR v_profile IN
    SELECT
      p.id,
      COALESCE(ut.invite_codes_limit, 3) AS codes_needed
    FROM profiles p
    LEFT JOIN user_tiers ut ON ut.user_id = p.id
    WHERE NOT EXISTS (
      SELECT 1 FROM invite_codes
      WHERE created_by_user_id = p.id
      AND code_type = 'referral'
    )
    ORDER BY p.created_at ASC  -- Process oldest profiles first
  LOOP
    v_backfilled_profiles := v_backfilled_profiles + 1;

    RAISE NOTICE '[%/%] Backfilling for User ID: %',
      v_backfilled_profiles,
      v_total_profiles,
      v_profile.id;

    -- Generate codes for this profile
    FOR i IN 1..v_profile.codes_needed LOOP
      -- Generate unique code using existing function
      SELECT generate_invite_code('FP') INTO v_generated_code;

      -- Insert code into invite_codes table
      INSERT INTO invite_codes (
        code,
        code_type,
        created_by_user_id,
        is_active,
        metadata
      ) VALUES (
        v_generated_code,
        'referral',
        v_profile.id,
        true,
        jsonb_build_object(
          'backfilled', true,
          'backfilled_at', now(),
          'migration_version', '20260205130705'
        )
      );

      RAISE NOTICE '  ✓ Generated code: %', v_generated_code;
    END LOOP;

    RAISE NOTICE '  → Total codes generated: %', v_profile.codes_needed;
  END LOOP;

  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE '=== Backfill Complete ===';
  RAISE NOTICE 'Profiles processed: %', v_backfilled_profiles;
  RAISE NOTICE 'Total codes created: %', v_backfilled_profiles * 3;  -- Assuming default 3 per user
  RAISE NOTICE 'Timestamp: %', now();

END $$;

-- =============================================================================
-- PART 4: Verification Queries (Commented for reference)
-- =============================================================================

-- To verify the migration worked, run these queries after deployment:

/*
-- 1. Verify specific users got codes (using auth.users for email)
SELECT
  au.email,
  p.id AS profile_id,
  COUNT(ic.id) AS total_codes,
  COUNT(ic.id) FILTER (WHERE ic.metadata->>'backfilled' = 'true') AS backfilled_codes,
  COUNT(ic.id) FILTER (WHERE ic.metadata->>'auto_generated' = 'true') AS auto_generated_codes,
  array_agg(ic.code ORDER BY ic.created_at) AS codes
FROM profiles p
JOIN auth.users au ON au.id = p.id
LEFT JOIN invite_codes ic ON ic.created_by_user_id = p.id AND ic.code_type = 'referral'
WHERE au.email IN ('marc.bernard@ece-france.com', 'alice.newman@example.com')
GROUP BY au.email, p.id;

-- 2. Check if any profiles still lack codes
SELECT
  COUNT(*) AS profiles_without_codes
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM invite_codes
  WHERE created_by_user_id = p.id
  AND code_type = 'referral'
);
-- Expected: 0 profiles_without_codes

-- 3. View backfill summary
SELECT
  COUNT(*) AS total_backfilled_codes,
  COUNT(DISTINCT created_by_user_id) AS unique_users_backfilled,
  MIN(created_at) AS first_code_created,
  MAX(created_at) AS last_code_created
FROM invite_codes
WHERE metadata->>'backfilled' = 'true';

-- 4. Verify trigger function exists
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'auto_generate_referral_codes_on_signup'
AND n.nspname = 'public';

-- 5. Verify trigger exists
SELECT
  tgname AS trigger_name,
  tgtype,
  tgenabled AS is_enabled
FROM pg_trigger
WHERE tgname = 'trigger_auto_generate_referral_codes';
*/
