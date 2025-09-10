-- Fix SECURITY DEFINER views security vulnerability
-- Replace SECURITY DEFINER views with SECURITY INVOKER versions

BEGIN;

-- Drop existing views that might have SECURITY DEFINER
DROP VIEW IF EXISTS public.email_stats CASCADE;
DROP VIEW IF EXISTS public.message_email_status CASCADE;

-- Recreate email_stats view with explicit SECURITY INVOKER
-- This view only accesses public.email_logs, so it's safe for users to query
CREATE VIEW public.email_stats
WITH (security_invoker = true)
AS
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

-- Recreate message_email_status view with explicit SECURITY INVOKER
-- This view only accesses public tables and respects RLS
CREATE VIEW public.message_email_status
WITH (security_invoker = true)
AS
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

-- Grant appropriate permissions to authenticated users
GRANT SELECT ON public.email_stats TO authenticated;
GRANT SELECT ON public.message_email_status TO authenticated;

-- Add security barrier to ensure RLS is respected
ALTER VIEW public.email_stats SET (security_barrier = true);
ALTER VIEW public.message_email_status SET (security_barrier = true);

COMMIT;