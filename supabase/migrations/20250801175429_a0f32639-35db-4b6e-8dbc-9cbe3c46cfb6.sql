-- Create table for email logs
CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid REFERENCES public.messages(id),
  recipient_email text NOT NULL,
  sender_email text NOT NULL,
  email_provider_id text,
  email_type text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for email logs
CREATE POLICY "Admins can view all email logs" 
ON public.email_logs 
FOR SELECT 
USING (
  (SELECT profiles.is_admin FROM profiles WHERE profiles.id = auth.uid()) = true
);

CREATE POLICY "System can insert email logs" 
ON public.email_logs 
FOR INSERT 
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_email_logs_message_id ON public.email_logs(message_id);
CREATE INDEX idx_email_logs_sent_at ON public.email_logs(sent_at);
CREATE INDEX idx_email_logs_email_type ON public.email_logs(email_type);