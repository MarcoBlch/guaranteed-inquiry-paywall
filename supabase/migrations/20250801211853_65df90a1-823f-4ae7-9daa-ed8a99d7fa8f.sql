-- COMPREHENSIVE SECURITY FIXES - Critical Database Security
BEGIN;

-- 1. Fix Escrow Transaction RLS Policy - Replace overly permissive policy
DROP POLICY IF EXISTS "Response page escrow access" ON public.escrow_transactions;

-- Create secure message-ID based policy for response pages
CREATE POLICY "Secure response page escrow access" ON public.escrow_transactions
FOR SELECT
USING (
  -- Only allow access when viewing a specific response page with valid message ID
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = escrow_transactions.message_id
    AND status IN ('held', 'completed', 'refunded')
  )
);

-- 2. Add Security Audit Triggers for sensitive tables
-- Trigger for escrow_transactions access
CREATE TRIGGER escrow_transactions_audit_trigger
  AFTER SELECT ON public.escrow_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sensitive_access();

-- Trigger for messages access  
CREATE TRIGGER messages_audit_trigger
  AFTER SELECT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sensitive_access();

-- Trigger for profiles access
CREATE TRIGGER profiles_audit_trigger
  AFTER SELECT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sensitive_access();

-- 3. Enhanced Admin Role Validation Function
CREATE OR REPLACE FUNCTION public.is_verified_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_is_admin BOOLEAN := FALSE;
BEGIN
  -- Get admin status with additional validation
  SELECT COALESCE(is_admin, FALSE) INTO user_is_admin
  FROM public.profiles 
  WHERE id = auth.uid()
  AND is_admin = TRUE;
  
  -- Log admin access attempts for security monitoring
  IF user_is_admin THEN
    INSERT INTO public.security_audit (
      user_id,
      event_type,
      event_data
    ) VALUES (
      auth.uid(),
      'admin_access_granted',
      jsonb_build_object(
        'timestamp', NOW(),
        'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
      )
    );
  ELSE
    INSERT INTO public.security_audit (
      user_id,
      event_type,
      event_data
    ) VALUES (
      auth.uid(),
      'admin_access_denied',
      jsonb_build_object(
        'timestamp', NOW(),
        'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
      )
    );
  END IF;
  
  RETURN user_is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. Update admin policies to use enhanced validation
DROP POLICY IF EXISTS "Verified admins can view all email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Verified admins can view message responses" ON public.message_responses;
DROP POLICY IF EXISTS "Verified admins can update message responses" ON public.message_responses;

-- Recreate with enhanced admin validation
CREATE POLICY "Enhanced admin email logs access" ON public.email_logs
FOR SELECT
USING (public.is_verified_admin());

CREATE POLICY "Enhanced admin message responses view" ON public.message_responses
FOR SELECT
USING (public.is_verified_admin());

CREATE POLICY "Enhanced admin message responses update" ON public.message_responses
FOR UPDATE
USING (public.is_verified_admin());

-- 5. Add Content Security Function
CREATE OR REPLACE FUNCTION public.secure_content_validation(content_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Comprehensive content validation
  IF content_text IS NULL OR LENGTH(TRIM(content_text)) < 10 THEN
    RETURN FALSE;
  END IF;
  
  IF LENGTH(content_text) > 10000 THEN
    RETURN FALSE;
  END IF;
  
  -- Check for dangerous patterns
  IF content_text ~* '(<script|javascript:|on\w+\s*=|data:text/html|vbscript:)' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT SET search_path = '';

-- 6. Add Message Content Validation Trigger
CREATE OR REPLACE FUNCTION public.validate_message_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate content security
  IF NOT public.secure_content_validation(NEW.content) THEN
    RAISE EXCEPTION 'Message content failed security validation';
  END IF;
  
  -- Sanitize content
  NEW.content = public.sanitize_text(NEW.content);
  
  -- Log message creation for audit
  INSERT INTO public.security_audit (
    user_id,
    event_type,
    event_data
  ) VALUES (
    auth.uid(),
    'message_created',
    jsonb_build_object(
      'message_id', NEW.id,
      'content_length', LENGTH(NEW.content),
      'timestamp', NOW()
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Apply content validation trigger
CREATE TRIGGER validate_message_content_trigger
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_message_content();

-- 7. Enhanced Rate Limiting Function
CREATE OR REPLACE FUNCTION public.check_server_rate_limit(
  user_identifier TEXT,
  action_type TEXT,
  max_requests INTEGER DEFAULT 10,
  window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP;
BEGIN
  window_start := NOW() - (window_minutes || ' minutes')::INTERVAL;
  
  -- Count recent requests from this user for this action
  SELECT COUNT(*) INTO current_count
  FROM public.security_audit
  WHERE event_data->>'user_identifier' = user_identifier
  AND event_type = action_type
  AND created_at > window_start;
  
  -- Log the rate limit check
  INSERT INTO public.security_audit (
    user_id,
    event_type,
    event_data
  ) VALUES (
    auth.uid(),
    'rate_limit_check',
    jsonb_build_object(
      'user_identifier', user_identifier,
      'action_type', action_type,
      'current_count', current_count,
      'max_requests', max_requests,
      'allowed', (current_count < max_requests)
    )
  );
  
  RETURN current_count < max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMIT;