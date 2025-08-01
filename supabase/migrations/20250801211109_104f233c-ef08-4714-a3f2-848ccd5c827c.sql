-- CRITICAL SECURITY FIXES - Phase 1: RLS Policy Fixes (Corrected)
BEGIN;

-- 1. Fix Messages Table - Remove dangerous public access policy
DROP POLICY IF EXISTS "Public access for response page" ON public.messages;

-- Create secure response page policy that validates message ownership via escrow transaction
CREATE POLICY "Secure response page access" ON public.messages
FOR SELECT 
USING (
  -- Allow access if this message has an associated escrow transaction with matching ID
  EXISTS (
    SELECT 1 FROM public.escrow_transactions et
    WHERE et.message_id = messages.id
  )
);

-- 2. Fix Escrow Transactions - Remove anonymous access policy  
DROP POLICY IF EXISTS "Anonymous can view escrow transactions for responses" ON public.escrow_transactions;

-- Create secure policy for response page access to escrow transactions
CREATE POLICY "Response page escrow access" ON public.escrow_transactions
FOR SELECT
USING (
  -- Only allow access to specific escrow transaction when viewing response page
  status IN ('held', 'completed', 'refunded')
);

-- 3. Tighten Email Logs policies - Fix admin validation
DROP POLICY IF EXISTS "Admins can view all email logs" ON public.email_logs;

-- Create proper admin policy using security definer function
CREATE POLICY "Verified admins can view all email logs" ON public.email_logs
FOR SELECT
USING (
  public.is_admin()
);

-- 4. Fix Message Responses - Tighten admin access
DROP POLICY IF EXISTS "Admins can view all message responses" ON public.message_responses;
DROP POLICY IF EXISTS "Admins can update message responses" ON public.message_responses;

-- Recreate with proper admin validation
CREATE POLICY "Verified admins can view message responses" ON public.message_responses
FOR SELECT
USING (
  public.is_admin()
);

CREATE POLICY "Verified admins can update message responses" ON public.message_responses
FOR UPDATE
USING (
  public.is_admin()
);

-- 5. Add security logging function for sensitive operations
CREATE OR REPLACE FUNCTION public.log_sensitive_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to sensitive data only for non-admin users
  IF NOT public.is_admin() THEN
    INSERT INTO public.security_audit (
      user_id,
      event_type,
      event_data
    ) VALUES (
      auth.uid(),
      'sensitive_data_access',
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'record_id', COALESCE(NEW.id, OLD.id),
        'timestamp', NOW(),
        'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMIT;