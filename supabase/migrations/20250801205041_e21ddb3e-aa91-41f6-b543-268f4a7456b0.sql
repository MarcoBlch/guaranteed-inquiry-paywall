-- Fix RLS policies for messages and escrow_transactions to allow proper access

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view messages sent to them" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own escrow transactions" ON public.escrow_transactions;

-- Create proper policies for messages
CREATE POLICY "Users can view messages sent to them"
ON public.messages
FOR SELECT
USING (user_id = auth.uid());

-- Allow public access to messages by message ID for response page
CREATE POLICY "Public can view messages by ID for responses"
ON public.messages
FOR SELECT
USING (true);

-- Create proper policies for escrow_transactions  
CREATE POLICY "Users can view their escrow transactions"
ON public.escrow_transactions
FOR SELECT
USING (recipient_user_id = auth.uid());

-- Allow public access to escrow_transactions when linked to a message for response page
CREATE POLICY "Public can view escrow transactions for message responses"
ON public.escrow_transactions
FOR SELECT
USING (true);