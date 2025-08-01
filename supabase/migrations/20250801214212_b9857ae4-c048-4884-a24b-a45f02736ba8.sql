-- FINALISER LES FIXES RLS - ÉTAPES 1 ET 2 COMPLÈTES

BEGIN;

-- ÉTAPE 1 - Créer les fonctions SECURITY DEFINER manquantes
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_verified_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(is_admin, false) FROM public.profiles WHERE id = auth.uid()
$$;

-- ÉTAPE 2 - FIXER LES POLICIES PROBLÉMATIQUES

-- Supprimer les policies qui référencent auth.users directement
DROP POLICY IF EXISTS "Users can view their own email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Users can view their message responses" ON public.message_responses;

-- Recréer avec les bonnes fonctions SECURITY DEFINER
CREATE POLICY "Users can view their own email logs" ON public.email_logs
    FOR SELECT TO public USING (
        recipient_email = public.get_current_user_email() 
        OR sender_email = public.get_current_user_email()
        OR EXISTS (
            SELECT 1 FROM public.messages m 
            WHERE m.id = email_logs.message_id 
            AND m.user_id = public.get_current_user_id()
        )
    );

CREATE POLICY "Users can view their message responses" ON public.message_responses
    FOR SELECT TO public USING (
        EXISTS (
            SELECT 1 FROM public.messages m 
            WHERE m.id = message_responses.message_id 
            AND m.user_id = public.get_current_user_id()
        )
    );

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.get_current_user_id() TO public;
GRANT EXECUTE ON FUNCTION public.is_verified_admin() TO public;

COMMIT;

-- Vérification finale
SELECT 'Fonctions créées:' as verification, COUNT(*) as count
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_current_user_email', 'is_verified_admin', 'get_current_user_id');

SELECT 'Policies sans auth.users:' as verification, COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public' 
AND qual NOT LIKE '%auth.users%' 
AND tablename IN ('email_logs', 'message_responses');