-- Migration pour améliorer la table email_logs existante
BEGIN;

-- Ajouter les colonnes manquantes à la table existante
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ajouter une contrainte CHECK pour email_type si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'email_logs_email_type_check'
    ) THEN
        ALTER TABLE public.email_logs 
        ADD CONSTRAINT email_logs_email_type_check 
        CHECK (email_type IN ('new_message_notification', 'response_notification', 'reminder', 'timeout_warning'));
    END IF;
END $$;

-- Index pour les requêtes fréquentes (avec IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_email_logs_message_id ON public.email_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON public.email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_delivered_at ON public.email_logs(delivered_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_failed_at ON public.email_logs(failed_at);

-- Ajouter des policies plus spécifiques si elles n'existent pas
DO $$
BEGIN
    -- Policy pour permettre aux utilisateurs de voir leurs propres logs d'emails
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'email_logs' 
        AND policyname = 'Users can view their own email logs'
    ) THEN
        CREATE POLICY "Users can view their own email logs" ON public.email_logs
            FOR SELECT USING (
                recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
                OR sender_email = (SELECT email FROM auth.users WHERE id = auth.uid())
                OR EXISTS (
                    SELECT 1 FROM public.messages m 
                    WHERE m.id = email_logs.message_id 
                    AND m.user_id = auth.uid()
                )
            );
    END IF;

    -- Policy pour les services peuvent tout mettre à jour
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'email_logs' 
        AND policyname = 'Service role can update email logs'
    ) THEN
        CREATE POLICY "Service role can update email logs" ON public.email_logs
            FOR UPDATE USING (true);
    END IF;
END $$;

-- Trigger pour updated_at (utilise la fonction existante)
DROP TRIGGER IF EXISTS update_email_logs_updated_at ON public.email_logs;
CREATE TRIGGER update_email_logs_updated_at 
    BEFORE UPDATE ON public.email_logs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vues utiles pour les statistiques
CREATE OR REPLACE VIEW public.email_stats AS
SELECT 
    email_type,
    COUNT(*) as total_sent,
    COUNT(delivered_at) as delivered,
    COUNT(opened_at) as opened,
    COUNT(clicked_at) as clicked,
    COUNT(failed_at) as failed,
    ROUND(
        (COUNT(delivered_at)::decimal / COUNT(*)) * 100, 
        2
    ) as delivery_rate,
    ROUND(
        (COUNT(opened_at)::decimal / NULLIF(COUNT(delivered_at), 0)) * 100, 
        2
    ) as open_rate
FROM public.email_logs
GROUP BY email_type;

-- Vue pour les emails par message
CREATE OR REPLACE VIEW public.message_email_status AS
SELECT 
    m.id as message_id,
    m.sender_email,
    (SELECT email FROM auth.users WHERE id = m.user_id) as recipient_email,
    COUNT(el.id) as emails_sent,
    MAX(el.sent_at) as last_email_sent,
    BOOL_OR(el.delivered_at IS NOT NULL) as any_delivered,
    BOOL_OR(el.opened_at IS NOT NULL) as any_opened,
    BOOL_OR(el.failed_at IS NOT NULL) as any_failed
FROM public.messages m
LEFT JOIN public.email_logs el ON el.message_id = m.id
GROUP BY m.id, m.sender_email, m.user_id;

-- Fonction pour nettoyer les anciens logs
CREATE OR REPLACE FUNCTION public.clean_old_email_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.email_logs 
    WHERE sent_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND email_type != 'response_notification'; -- Garder les réponses importantes
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Commentaires pour documentation
COMMENT ON TABLE public.email_logs IS 'Log de tous les emails envoyés par le système FastPass';
COMMENT ON COLUMN public.email_logs.email_type IS 'Type d''email: new_message_notification, response_notification, reminder, timeout_warning';
COMMENT ON COLUMN public.email_logs.metadata IS 'Données additionnelles spécifiques au type d''email (montant, délai, etc.)';
COMMENT ON COLUMN public.email_logs.delivered_at IS 'Timestamp de livraison confirmée par le fournisseur email';
COMMENT ON COLUMN public.email_logs.opened_at IS 'Timestamp d''ouverture de l''email par le destinataire';
COMMENT ON COLUMN public.email_logs.clicked_at IS 'Timestamp de clic sur un lien dans l''email';
COMMENT ON COLUMN public.email_logs.failed_at IS 'Timestamp d''échec de livraison';
COMMENT ON FUNCTION public.clean_old_email_logs IS 'Nettoie les anciens logs d''emails pour optimiser la base de données';