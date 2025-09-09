-- Create initial admin user: marc.bernard@ece-france.com
-- This migration bypasses the admin escalation prevention trigger

BEGIN;

-- Temporarily disable the admin escalation trigger
DROP TRIGGER IF EXISTS trigger_prevent_admin_escalation ON public.profiles;

-- Update the user to be admin if they exist, or create them if they don't
INSERT INTO public.profiles (id, is_admin)
SELECT 
    u.id,
    true
FROM auth.users u 
WHERE u.email = 'marc.bernard@ece-france.com'
ON CONFLICT (id) 
DO UPDATE SET 
    is_admin = true,
    updated_at = now();

-- If no user found, we'll need to wait for them to sign up first
-- This query will show us if the admin was granted or if the user doesn't exist yet
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM auth.users u 
            JOIN public.profiles p ON u.id = p.id 
            WHERE u.email = 'marc.bernard@ece-france.com' AND p.is_admin = true
        ) 
        THEN 'SUCCESS: Admin privileges granted to marc.bernard@ece-france.com'
        ELSE 'INFO: User marc.bernard@ece-france.com not found. They need to sign up first.'
    END as result;

-- Re-enable the admin escalation trigger
CREATE TRIGGER trigger_prevent_admin_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_admin_escalation();

-- Log this admin creation
INSERT INTO public.security_audit (user_id, event_type, event_data)
SELECT 
    u.id,
    'initial_admin_creation',
    jsonb_build_object(
        'email', 'marc.bernard@ece-france.com',
        'granted_by', 'migration'
    )
FROM auth.users u 
JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'marc.bernard@ece-france.com' AND p.is_admin = true;

COMMIT;