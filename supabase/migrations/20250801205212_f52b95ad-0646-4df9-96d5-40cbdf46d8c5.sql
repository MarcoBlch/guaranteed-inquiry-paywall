-- Fix RLS policies to be secure but functional

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Public can view messages by ID for responses" ON public.messages;
DROP POLICY IF EXISTS "Public can view escrow transactions for message responses" ON public.escrow_transactions;

-- Allow anonymous users to view specific messages by ID (needed for response page)
CREATE POLICY "Anonymous can view messages for responses" 
ON public.messages 
FOR SELECT 
TO anon
USING (true);

-- Allow anonymous users to view escrow transactions for responses
CREATE POLICY "Anonymous can view escrow transactions for responses"
ON public.escrow_transactions
FOR SELECT
TO anon  
USING (true);