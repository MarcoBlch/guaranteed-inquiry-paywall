-- Migration: Enhance email_logs table for Phase 3A (Postmark integration)
-- This adds comprehensive email tracking fields for delivery, opens, clicks, and response detection

BEGIN;

-- Add missing tracking timestamp fields to email_logs
ALTER TABLE public.email_logs
ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS opened_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS clicked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS failed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS bounced_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS spam_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS response_detected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS email_service_provider text DEFAULT 'resend' CHECK (email_service_provider IN ('resend', 'postmark'));

-- Add index for faster queries on email tracking
CREATE INDEX IF NOT EXISTS idx_email_logs_provider_id ON public.email_logs(email_provider_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_message_id ON public.email_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_response_detected ON public.email_logs(response_detected_at) WHERE response_detected_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_logs_service_provider ON public.email_logs(email_service_provider);

-- Create email_response_tracking table for precise response timing and quality control
CREATE TABLE IF NOT EXISTS public.email_response_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  original_email_id text NOT NULL, -- Email provider ID from outbound message
  inbound_email_id text, -- Email provider ID from inbound response
  response_email_subject text,
  response_email_from text,
  response_received_at timestamp with time zone NOT NULL,
  response_detected_method text NOT NULL CHECK (response_detected_method IN ('webhook', 'manual', 'grace_period')),
  within_deadline boolean NOT NULL DEFAULT false,
  grace_period_used boolean NOT NULL DEFAULT false,
  email_headers jsonb, -- Store email headers for verification
  response_content_preview text, -- First 500 chars for quality checks
  quality_score integer CHECK (quality_score >= 1 AND quality_score <= 5),
  quality_notes text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on email_response_tracking
ALTER TABLE public.email_response_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for email_response_tracking
CREATE POLICY "Admins can view all response tracking"
ON public.email_response_tracking
FOR SELECT
USING (
  (SELECT profiles.is_admin FROM profiles WHERE profiles.id = auth.uid()) = true
);

CREATE POLICY "Service role can insert response tracking"
ON public.email_response_tracking
FOR INSERT
WITH CHECK (true); -- Service role only

CREATE POLICY "Service role can update response tracking"
ON public.email_response_tracking
FOR UPDATE
USING (true); -- Service role only

-- Create indexes for email_response_tracking
CREATE INDEX IF NOT EXISTS idx_email_response_tracking_message_id ON public.email_response_tracking(message_id);
CREATE INDEX IF NOT EXISTS idx_email_response_tracking_inbound_id ON public.email_response_tracking(inbound_email_id);
CREATE INDEX IF NOT EXISTS idx_email_response_tracking_received_at ON public.email_response_tracking(response_received_at);
CREATE INDEX IF NOT EXISTS idx_email_response_tracking_within_deadline ON public.email_response_tracking(within_deadline);

-- Create view for email delivery statistics by service provider
CREATE OR REPLACE VIEW public.email_service_stats AS
SELECT
    email_service_provider,
    email_type,
    COUNT(*) as total_sent,
    COUNT(delivered_at) as delivered,
    COUNT(opened_at) as opened,
    COUNT(clicked_at) as clicked,
    COUNT(failed_at) as failed,
    COUNT(bounced_at) as bounced,
    COUNT(spam_at) as spam,
    ROUND(
        (COUNT(delivered_at)::decimal / NULLIF(COUNT(*), 0)) * 100,
        2
    ) as delivery_rate,
    ROUND(
        (COUNT(opened_at)::decimal / NULLIF(COUNT(delivered_at), 0)) * 100,
        2
    ) as open_rate,
    ROUND(
        (COUNT(clicked_at)::decimal / NULLIF(COUNT(delivered_at), 0)) * 100,
        2
    ) as click_rate,
    ROUND(
        (COUNT(failed_at)::decimal / NULLIF(COUNT(*), 0)) * 100,
        2
    ) as failure_rate
FROM public.email_logs
GROUP BY email_service_provider, email_type;

-- Create view for response tracking analytics
CREATE OR REPLACE VIEW public.response_tracking_stats AS
SELECT
    COUNT(*) as total_responses,
    COUNT(*) FILTER (WHERE within_deadline = true) as on_time_responses,
    COUNT(*) FILTER (WHERE grace_period_used = true) as grace_period_responses,
    ROUND(
        (COUNT(*) FILTER (WHERE within_deadline = true)::decimal / NULLIF(COUNT(*), 0)) * 100,
        2
    ) as on_time_percentage,
    AVG(quality_score) as avg_quality_score,
    COUNT(*) FILTER (WHERE response_detected_method = 'webhook') as webhook_detected,
    COUNT(*) FILTER (WHERE response_detected_method = 'manual') as manually_marked,
    COUNT(*) FILTER (WHERE response_detected_method = 'grace_period') as grace_period_detected
FROM public.email_response_tracking;

-- Add comment documentation
COMMENT ON TABLE public.email_response_tracking IS 'Tracks email responses with precise timing for escrow deadline enforcement and quality control';
COMMENT ON COLUMN public.email_response_tracking.grace_period_used IS '15-minute grace period for late responses after deadline';
COMMENT ON COLUMN public.email_response_tracking.response_content_preview IS 'First 500 characters for quality verification (not stored in main dashboard)';
COMMENT ON COLUMN public.email_response_tracking.quality_score IS 'Sender rating from 1-5 stars (optional, sent 24h after response)';

COMMIT;
