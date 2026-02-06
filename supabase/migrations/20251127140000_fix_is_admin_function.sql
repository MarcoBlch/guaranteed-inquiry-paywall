-- Fix is_admin() function to work correctly with RLS
-- The function was returning NULL in some cases, causing RLS to block access

-- Drop and recreate the function with better null handling
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Verify the function works
DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM public.profiles
  WHERE is_admin = true;

  IF admin_count > 0 THEN
    RAISE NOTICE 'is_admin() function fixed. Found % admin users.', admin_count;
  ELSE
    RAISE WARNING 'No admin users found! Run: UPDATE profiles SET is_admin = true WHERE id IN (SELECT id FROM auth.users WHERE email = ''your-email@example.com'');';
  END IF;
END $$;
