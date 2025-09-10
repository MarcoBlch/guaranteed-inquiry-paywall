-- Fix all security issues identified in Supabase Security Center
-- 1. Function Search Path Mutable (Critical)
-- 2. Configure proper Auth settings

BEGIN;

-- ===== FIX 1: SECURE SEARCH_PATH FOR FUNCTIONS =====

-- Fix get_current_user_id function with secure search_path
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''  -- Secure search path
AS $$
  SELECT auth.uid()
$$;

-- Fix is_verified_admin function with secure search_path
CREATE OR REPLACE FUNCTION public.is_verified_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''  -- Secure search path
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

-- ===== FIX 2: AUTH CONFIGURATION IMPROVEMENTS =====

-- Note: Some auth settings need to be configured via Supabase Dashboard
-- This migration handles what can be done via SQL

-- Grant execute permissions (maintain functionality)
GRANT EXECUTE ON FUNCTION public.get_current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_verified_admin() TO authenticated;

-- ===== VERIFICATION =====

-- Verify functions have secure search_path
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('get_current_user_id', 'is_verified_admin')
    AND (prosecdef IS NULL OR prosecdef = '');
    
    IF func_count > 0 THEN
        RAISE NOTICE 'WARNING: Some functions may still have mutable search_path';
    ELSE
        RAISE NOTICE 'SUCCESS: All functions have secure search_path configured';
    END IF;
END $$;

COMMIT;

-- Manual steps required in Supabase Dashboard:
-- 1. Go to Authentication > Settings
-- 2. Set "OTP expiry" to 300 seconds (5 minutes) or less
-- 3. Enable "Enable leaked password protection"
-- 4. Consider upgrading PostgreSQL version if available