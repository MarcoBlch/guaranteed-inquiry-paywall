-- Fix is_admin() to work in both authenticated and unauthenticated contexts
-- Previous version returned false because SECURITY DEFINER changes the execution context

-- Use CREATE OR REPLACE instead of DROP to avoid dependency issues
-- This preserves all the RLS policies that depend on this function

-- Recreate without SECURITY DEFINER to preserve the caller's auth context
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE SQL STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- Test the function
DO $$
BEGIN
  RAISE NOTICE 'is_admin() function recreated without SECURITY DEFINER';
  RAISE NOTICE 'This allows it to use the caller''s auth.uid() context';
END $$;
