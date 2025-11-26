-- 1. Créer une fonction security definer pour vérifier les admins
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT is_admin FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 2. Supprimer toutes les politiques existantes pour les recréer optimisées
DROP POLICY IF EXISTS "Admins can insert admin actions" ON public.admin_actions;
DROP POLICY IF EXISTS "Admins can view admin actions" ON public.admin_actions;
DROP POLICY IF EXISTS "Admins can update message responses" ON public.message_responses;
DROP POLICY IF EXISTS "Admins can view all message responses" ON public.message_responses;
DROP POLICY IF EXISTS "Users can view their message responses" ON public.message_responses;
DROP POLICY IF EXISTS "Admins can view all escrow transactions" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Users can view their own escrow transactions" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages sent to them" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can manage their own pricing tiers" ON public.pricing_tiers;
DROP POLICY IF EXISTS "Users can view their own pricing tiers" ON public.pricing_tiers;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- 3. Recréer les politiques optimisées

-- Admin actions
CREATE POLICY "Admins can manage admin actions" ON public.admin_actions
FOR ALL USING (public.is_admin());

-- Message responses - politiques consolidées
CREATE POLICY "Users can view message responses" ON public.message_responses
FOR SELECT USING (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM messages m 
    WHERE m.id = message_responses.message_id 
    AND (
      m.user_id = (select auth.uid()) OR 
      m.sender_email = (
        SELECT users.email FROM auth.users 
        WHERE users.id = (select auth.uid())
      )
    )
  )
);

CREATE POLICY "Admins can update message responses" ON public.message_responses
FOR UPDATE USING (public.is_admin());

-- Escrow transactions - politiques consolidées
CREATE POLICY "Users can view escrow transactions" ON public.escrow_transactions
FOR SELECT USING (
  public.is_admin() OR 
  recipient_user_id = (select auth.uid()) OR 
  sender_email = (
    SELECT users.email FROM auth.users 
    WHERE users.id = (select auth.uid())
  )
);

-- Messages - politiques consolidées
CREATE POLICY "Users can view messages" ON public.messages
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their messages" ON public.messages
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their messages" ON public.messages
FOR DELETE USING ((select auth.uid()) = user_id);

-- Pricing tiers - garder séparées car logiques différentes
DROP POLICY IF EXISTS "Public can view active pricing tiers" ON public.pricing_tiers;
CREATE POLICY "Public can view active pricing tiers" ON public.pricing_tiers
FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage their pricing tiers" ON public.pricing_tiers
FOR ALL USING ((select auth.uid()) = user_id);

-- Profiles
CREATE POLICY "Users can view their profile" ON public.profiles
FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update their profile" ON public.profiles
FOR UPDATE USING ((select auth.uid()) = id);