
-- Add response_deadline_hours column to messages table
ALTER TABLE public.messages ADD COLUMN response_deadline_hours INTEGER DEFAULT 24 CHECK (response_deadline_hours IN (24, 48, 72));

-- Update escrow_transactions to use dynamic expiration based on message deadline
ALTER TABLE public.escrow_transactions DROP COLUMN expires_at;
ALTER TABLE public.escrow_transactions ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;

-- Create function to calculate expiration based on message deadline
CREATE OR REPLACE FUNCTION calculate_expiration_time(message_id UUID)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    deadline_hours INTEGER;
BEGIN
    SELECT response_deadline_hours INTO deadline_hours
    FROM public.messages 
    WHERE id = message_id;
    
    RETURN now() + (deadline_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Update existing messages to have 24h deadline (retroactive)
UPDATE public.messages SET response_deadline_hours = 24 WHERE response_deadline_hours IS NULL;

-- Add pricing tiers table for different response times
CREATE TABLE public.pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  deadline_hours INTEGER CHECK (deadline_hours IN (24, 48, 72)) NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 10.00),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, deadline_hours)
);

-- Enable RLS on pricing_tiers
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing_tiers
CREATE POLICY "Users can view their own pricing tiers"
  ON public.pricing_tiers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own pricing tiers"
  ON public.pricing_tiers
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view active pricing tiers"
  ON public.pricing_tiers
  FOR SELECT
  USING (is_active = true);

-- Create trigger for pricing_tiers updated_at
CREATE TRIGGER update_pricing_tiers_updated_at
    BEFORE UPDATE ON public.pricing_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_pricing_tiers_user_deadline ON public.pricing_tiers(user_id, deadline_hours);
CREATE INDEX idx_pricing_tiers_active ON public.pricing_tiers(is_active);
