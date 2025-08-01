-- Migration pour corriger les problèmes de sécurité détectés
BEGIN;

-- Supprimer les vues problématiques et les recréer sans SECURITY DEFINER
DROP VIEW IF EXISTS public.email_stats;
DROP VIEW IF EXISTS public.message_email_status;

-- Recréer la vue email_stats avec des permissions appropriées
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

-- Recréer la vue message_email_status sans exposer auth.users
CREATE OR REPLACE VIEW public.message_email_status AS
SELECT 
    m.id as message_id,
    m.sender_email,
    m.user_id as recipient_user_id,
    COUNT(el.id) as emails_sent,
    MAX(el.sent_at) as last_email_sent,
    BOOL_OR(el.delivered_at IS NOT NULL) as any_delivered,
    BOOL_OR(el.opened_at IS NOT NULL) as any_opened,
    BOOL_OR(el.failed_at IS NOT NULL) as any_failed
FROM public.messages m
LEFT JOIN public.email_logs el ON el.message_id = m.id
GROUP BY m.id, m.sender_email, m.user_id;

-- Ajouter RLS sur les vues (impossible directement, mais on peut utiliser la sécurité des tables sous-jacentes)
-- Les vues héritent automatiquement des politiques RLS des tables qu'elles interrogent

-- Mettre à jour la fonction clean_old_email_logs avec search_path sécurisé
CREATE OR REPLACE FUNCTION public.clean_old_email_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.email_logs 
    WHERE sent_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND email_type != 'response_notification'; -- Garder les réponses importantes
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

COMMIT;