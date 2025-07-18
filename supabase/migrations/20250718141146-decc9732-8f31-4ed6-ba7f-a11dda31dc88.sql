-- Migration 001_remove_paypal.sql
BEGIN;

-- Supprimer colonnes PayPal
ALTER TABLE public.profiles DROP COLUMN IF EXISTS paypal_email;

-- Ajouter colonnes Stripe
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT FALSE;

-- Mettre à jour prix par défaut
UPDATE public.profiles SET price = 10 WHERE price IS NULL;

-- Créer index
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account 
ON public.profiles(stripe_account_id) 
WHERE stripe_account_id IS NOT NULL;

COMMIT;