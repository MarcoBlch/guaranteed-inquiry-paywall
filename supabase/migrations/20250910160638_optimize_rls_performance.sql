-- Optimize RLS policies for better performance
-- Replace auth.uid() with (SELECT auth.uid()) to avoid re-evaluation per row

BEGIN;

-- ===== OPTIMIZE PROFILES TABLE POLICIES =====

-- Drop and recreate optimized policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (id = (SELECT auth.uid()));

-- ===== OPTIMIZE MESSAGES TABLE POLICIES =====

DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

CREATE POLICY "Users can view their messages" 
    ON public.messages FOR SELECT 
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own messages" 
    ON public.messages FOR UPDATE 
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own messages" 
    ON public.messages FOR DELETE 
    USING (user_id = (SELECT auth.uid()));

-- ===== OPTIMIZE ESCROW_TRANSACTIONS TABLE POLICIES =====

DROP POLICY IF EXISTS "Users can view their escrow transactions" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Admins can view all escrow transactions" ON public.escrow_transactions;

CREATE POLICY "Users can view their escrow transactions" 
    ON public.escrow_transactions FOR SELECT 
    USING (recipient_user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can view all escrow transactions" 
    ON public.escrow_transactions FOR SELECT 
    USING ((SELECT public.is_verified_admin()));

-- ===== OPTIMIZE PRICING_TIERS TABLE POLICIES =====

DROP POLICY IF EXISTS "Users can view their own pricing tiers" ON public.pricing_tiers;
DROP POLICY IF EXISTS "Users can manage their own pricing tiers" ON public.pricing_tiers;

CREATE POLICY "Users can view their own pricing tiers" 
    ON public.pricing_tiers FOR SELECT 
    USING (user_id = (SELECT auth.uid()) OR is_active = true);

CREATE POLICY "Users can manage their own pricing tiers" 
    ON public.pricing_tiers FOR ALL 
    USING (user_id = (SELECT auth.uid()));

-- ===== OPTIMIZE ADMIN_ACTIONS TABLE POLICIES =====

DROP POLICY IF EXISTS "Admins can view admin actions" ON public.admin_actions;
DROP POLICY IF EXISTS "Admins can insert admin actions" ON public.admin_actions;

CREATE POLICY "Admins can view admin actions" 
    ON public.admin_actions FOR SELECT 
    USING ((SELECT public.is_verified_admin()));

CREATE POLICY "Admins can insert admin actions" 
    ON public.admin_actions FOR INSERT 
    WITH CHECK ((SELECT public.is_verified_admin()));

-- ===== VERIFICATION =====

-- Count optimized policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'messages', 'escrow_transactions', 'pricing_tiers', 'admin_actions');
    
    RAISE NOTICE 'Optimized % RLS policies for better performance', policy_count;
END $$;

COMMIT;