-- Fix messages RLS policy to work correctly with authenticated users

-- Drop the current policies for messages
DROP POLICY IF EXISTS "Users can view messages sent to them" ON public.messages;
DROP POLICY IF EXISTS "Anonymous can view messages for responses" ON public.messages;

-- Create a simple, working policy for authenticated users to see their messages
CREATE POLICY "Users can view their messages"
ON public.messages
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Keep anonymous access for response pages
CREATE POLICY "Public access for response page"
ON public.messages  
FOR SELECT
TO anon
USING (true);