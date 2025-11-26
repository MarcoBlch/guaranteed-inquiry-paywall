-- Secure database functions by adding proper search_path and input validation

-- 1. Update existing functions to be more secure
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_expiration_time(message_id uuid)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $function$
DECLARE
    deadline_hours INTEGER;
BEGIN
    -- Input validation
    IF message_id IS NULL THEN
        RAISE EXCEPTION 'message_id cannot be null';
    END IF;
    
    SELECT response_deadline_hours INTO deadline_hours
    FROM public.messages 
    WHERE id = message_id;
    
    -- Validation
    IF deadline_hours IS NULL THEN
        RAISE EXCEPTION 'Message not found or deadline_hours is null';
    END IF;
    
    IF deadline_hours < 1 OR deadline_hours > 168 THEN -- Max 1 week
        RAISE EXCEPTION 'Invalid deadline_hours: must be between 1 and 168';
    END IF;
    
    RETURN now() + (deadline_hours || ' hours')::INTERVAL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $function$
BEGIN
    -- Input validation
    IF NEW.id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$function$;

-- 2. Create additional security functions

-- Function to get current user email securely
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $function$
  SELECT email FROM auth.users WHERE id = auth.uid();
$function$;

-- Function to validate email format
CREATE OR REPLACE FUNCTION public.is_valid_email(email_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = ''
AS $function$
BEGIN
    -- Basic email validation
    RETURN email_text ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
           AND length(email_text) <= 254
           AND length(email_text) >= 5;
END;
$function$;

-- Function to sanitize text input
CREATE OR REPLACE FUNCTION public.sanitize_text(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = ''
AS $function$
BEGIN
    -- Remove potential XSS vectors and clean up text
    RETURN trim(
        regexp_replace(
            regexp_replace(
                regexp_replace(input_text, '[<>]', '', 'g'),
                'javascript:', '', 'gi'
            ),
            'data:', '', 'gi'
        )
    );
END;
$function$;

-- 3. Add check constraints for data validation

-- Validate email formats in relevant tables
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS check_sender_email_format;

ALTER TABLE public.messages 
ADD CONSTRAINT check_sender_email_format 
CHECK (public.is_valid_email(sender_email));

ALTER TABLE public.escrow_transactions 
DROP CONSTRAINT IF EXISTS check_sender_email_format;

ALTER TABLE public.escrow_transactions 
ADD CONSTRAINT check_sender_email_format 
CHECK (public.is_valid_email(sender_email));

-- Validate message content length and basic content
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS check_content_length;

ALTER TABLE public.messages 
ADD CONSTRAINT check_content_length 
CHECK (length(content) >= 10 AND length(content) <= 10000);

-- Validate amount ranges
ALTER TABLE public.escrow_transactions 
DROP CONSTRAINT IF EXISTS check_amount_range;

ALTER TABLE public.escrow_transactions 
ADD CONSTRAINT check_amount_range 
CHECK (amount > 0 AND amount <= 10000); -- Max 10k EUR

ALTER TABLE public.pricing_tiers 
DROP CONSTRAINT IF EXISTS check_price_range;

ALTER TABLE public.pricing_tiers 
ADD CONSTRAINT check_price_range 
CHECK (price > 0 AND price <= 10000);

-- Validate response deadline hours
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS check_response_deadline;

ALTER TABLE public.messages 
ADD CONSTRAINT check_response_deadline 
CHECK (response_deadline_hours >= 1 AND response_deadline_hours <= 168);

ALTER TABLE public.pricing_tiers 
DROP CONSTRAINT IF EXISTS check_deadline_hours;

ALTER TABLE public.pricing_tiers 
ADD CONSTRAINT check_deadline_hours 
CHECK (deadline_hours >= 1 AND deadline_hours <= 168);

-- 4. Create audit logging table for security events
CREATE TABLE IF NOT EXISTS public.security_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.security_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
DROP POLICY IF EXISTS "Admins can view security audit" ON public.security_audit;
CREATE POLICY "Admins can view security audit" ON public.security_audit
FOR SELECT USING (public.is_admin());

-- System can insert audit logs
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit;
CREATE POLICY "System can insert audit logs" ON public.security_audit
FOR INSERT WITH CHECK (true);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON public.security_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_event_type ON public.security_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON public.security_audit(created_at);

-- 6. Add trigger to prevent is_admin escalation
CREATE OR REPLACE FUNCTION public.prevent_admin_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    -- Only existing admins can modify is_admin field
    IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
        IF NOT public.is_admin() THEN
            RAISE EXCEPTION 'Only administrators can modify admin status';
        END IF;
        
        -- Log admin privilege changes
        INSERT INTO public.security_audit (user_id, event_type, event_data)
        VALUES (
            auth.uid(),
            'admin_privilege_change',
            jsonb_build_object(
                'target_user_id', NEW.id,
                'old_admin', OLD.is_admin,
                'new_admin', NEW.is_admin
            )
        );
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Add the trigger to profiles table
DROP TRIGGER IF EXISTS trigger_prevent_admin_escalation ON public.profiles;
CREATE TRIGGER trigger_prevent_admin_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_admin_escalation();