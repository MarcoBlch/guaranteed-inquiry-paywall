
-- Create escrow transactions table
CREATE TABLE public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT CHECK (status IN ('pending', 'held', 'released', 'refunded', 'failed')) DEFAULT 'pending',
  recipient_user_id UUID REFERENCES public.profiles(id),
  sender_email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create responses table (metadata only for confidentiality)
CREATE TABLE public.message_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  escrow_transaction_id UUID REFERENCES public.escrow_transactions(id) ON DELETE CASCADE,
  has_response BOOLEAN DEFAULT false,
  response_received_at TIMESTAMP WITH TIME ZONE,
  validated_by_admin BOOLEAN DEFAULT false,
  validated_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  email_thread_id TEXT, -- For tracking email conversations
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create admin actions log
CREATE TABLE public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES public.profiles(id),
  action_type TEXT CHECK (action_type IN ('validate_response', 'reject_response', 'refund_manual', 'release_manual')) NOT NULL,
  escrow_transaction_id UUID REFERENCES public.escrow_transactions(id),
  message_response_id UUID REFERENCES public.message_responses(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add admin role to profiles
ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for escrow_transactions
CREATE POLICY "Users can view their own escrow transactions"
  ON public.escrow_transactions
  FOR SELECT
  USING (auth.uid() = recipient_user_id OR sender_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Admins can view all escrow transactions"
  ON public.escrow_transactions
  FOR SELECT
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

CREATE POLICY "System can insert escrow transactions"
  ON public.escrow_transactions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System and admins can update escrow transactions"
  ON public.escrow_transactions
  FOR UPDATE
  USING (true);

-- RLS Policies for message_responses
CREATE POLICY "Users can view their message responses"
  ON public.message_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m 
      WHERE m.id = message_id 
      AND (m.user_id = auth.uid() OR m.sender_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Admins can view all message responses"
  ON public.message_responses
  FOR SELECT
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

CREATE POLICY "System can insert message responses"
  ON public.message_responses
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update message responses"
  ON public.message_responses
  FOR UPDATE
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- RLS Policies for admin_actions
CREATE POLICY "Admins can view admin actions"
  ON public.admin_actions
  FOR SELECT
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

CREATE POLICY "Admins can insert admin actions"
  ON public.admin_actions
  FOR INSERT
  WITH CHECK ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- Create indexes for performance
CREATE INDEX idx_escrow_transactions_status ON public.escrow_transactions(status);
CREATE INDEX idx_escrow_transactions_expires_at ON public.escrow_transactions(expires_at);
CREATE INDEX idx_message_responses_message_id ON public.message_responses(message_id);
CREATE INDEX idx_message_responses_has_response ON public.message_responses(has_response);
CREATE INDEX idx_admin_actions_created_at ON public.admin_actions(created_at);

-- Add updated_at trigger for escrow_transactions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_escrow_transactions_updated_at
    BEFORE UPDATE ON public.escrow_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_responses_updated_at
    BEFORE UPDATE ON public.message_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
