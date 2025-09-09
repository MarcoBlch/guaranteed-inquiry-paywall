-- Grant admin privileges to marc.bernard@ece-france.com
-- This script updates the profiles table to set is_admin = true for the specified email

UPDATE profiles 
SET is_admin = true 
WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'marc.bernard@ece-france.com'
);

-- Verify the update
SELECT 
    p.id,
    u.email,
    p.is_admin,
    p.created_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'marc.bernard@ece-france.com';