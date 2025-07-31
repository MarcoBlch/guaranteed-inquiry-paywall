-- Mettre à jour le statut de configuration Stripe pour l'utilisateur
UPDATE profiles 
SET stripe_onboarding_completed = true, updated_at = now()
WHERE stripe_account_id = 'acct_1RqtpORxuvbSsmvo';