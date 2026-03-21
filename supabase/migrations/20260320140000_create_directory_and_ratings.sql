-- ============================================================================
-- DIRECTORY + RATING SYSTEM MIGRATION
-- ============================================================================
-- Purpose: Add directory page tables (demand-signaling for non-users) and
--          rating system (sender rates responses via magic link)
-- Related: Phase A (Directory) + Phase B (Rating) of design overhaul
-- ============================================================================

BEGIN;

-- =====================
-- DIRECTORY REQUESTS
-- =====================
-- Stores target profiles (public figures who don't have FastPass yet)
-- Admins create entries; anonymous users request access via email

CREATE TABLE IF NOT EXISTS public.directory_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who is being requested (public figure name, NOT a profiles FK)
  target_name VARCHAR(255) NOT NULL,
  target_slug VARCHAR(255) NOT NULL,  -- URL-safe: "elon-musk"
  target_description TEXT,             -- "CEO of Tesla, SpaceX"
  target_avatar_url TEXT,              -- optional image URL
  target_category VARCHAR(100),        -- "tech", "finance", "creator", etc.

  -- Demand tracking (denormalized from directory_request_emails count)
  request_count INTEGER NOT NULL DEFAULT 0,

  -- Admin workflow
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'onboarded', 'removed')),
  invited_at TIMESTAMPTZ,
  onboarded_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Individual request submissions (many requesters per directory entry)
CREATE TABLE IF NOT EXISTS public.directory_request_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directory_request_id UUID NOT NULL REFERENCES public.directory_requests(id) ON DELETE CASCADE,
  requester_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- DIRECTORY INDEXES
-- ============================================================================

-- Unique: one email per target (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_directory_request_emails_unique
  ON public.directory_request_emails(directory_request_id, LOWER(email));

-- Slug lookup (for request submission)
CREATE INDEX IF NOT EXISTS idx_directory_requests_slug
  ON public.directory_requests(target_slug);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_directory_requests_status
  ON public.directory_requests(status);

-- Category filtering
CREATE INDEX IF NOT EXISTS idx_directory_requests_category
  ON public.directory_requests(target_category);

-- Sorting by demand (most requested first)
CREATE INDEX IF NOT EXISTS idx_directory_requests_count
  ON public.directory_requests(request_count DESC);

-- ============================================================================
-- DIRECTORY RLS
-- ============================================================================

ALTER TABLE public.directory_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directory_request_emails ENABLE ROW LEVEL SECURITY;

-- Public read for directory listing (only active entries)
CREATE POLICY "Anyone can view active directory entries"
  ON public.directory_requests FOR SELECT
  USING (status = 'active');

-- Admin can view ALL entries (including removed/invited)
CREATE POLICY "Admins can view all directory requests"
  ON public.directory_requests FOR SELECT
  USING (public.is_admin());

-- Admin can update entries
CREATE POLICY "Admins can update directory requests"
  ON public.directory_requests FOR UPDATE
  USING (public.is_admin());

-- Admin can insert entries
CREATE POLICY "Admins can insert directory requests"
  ON public.directory_requests FOR INSERT
  WITH CHECK (public.is_admin());

-- Service role handles directory_request_emails (Edge Functions use service key)
-- Anonymous INSERT is done via Edge Function with service_role key
CREATE POLICY "Service role can insert directory emails"
  ON public.directory_request_emails FOR INSERT
  WITH CHECK (true);

-- Admin can view requesters
CREATE POLICY "Admins can view directory request emails"
  ON public.directory_request_emails FOR SELECT
  USING (public.is_admin());

-- ============================================================================
-- DIRECTORY TRIGGERS
-- ============================================================================

CREATE TRIGGER update_directory_requests_updated_at
  BEFORE UPDATE ON public.directory_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- DIRECTORY COMMENTS
-- ============================================================================

COMMENT ON TABLE public.directory_requests IS
  'Public figures who can be requested on the directory page — admins manage entries, anonymous users signal demand';

COMMENT ON TABLE public.directory_request_emails IS
  'Individual request submissions (name + email) for directory entries — one email per target person';

COMMENT ON COLUMN public.directory_requests.target_slug IS
  'URL-safe identifier for the target (e.g., "elon-musk")';

COMMENT ON COLUMN public.directory_requests.request_count IS
  'Denormalized count of unique requesters — incremented by submit-directory-request Edge Function';

-- ============================================================================
-- RATING SYSTEM
-- ============================================================================
-- Stores sender ratings for responses (1-5 stars + optional comment)
-- Secured via HMAC token — no sender account required

CREATE TABLE IF NOT EXISTS public.message_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links to the escrow transaction
  transaction_id UUID NOT NULL REFERENCES public.escrow_transactions(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,

  -- Rating data
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,

  -- Security: HMAC token hash prevents forging
  rating_token_hash TEXT NOT NULL,

  -- Sender info (denormalized from transaction for display)
  sender_email VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- RATING INDEXES
-- ============================================================================

-- One rating per transaction (prevents duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_ratings_transaction
  ON public.message_ratings(transaction_id);

-- For profile avg calculation
CREATE INDEX IF NOT EXISTS idx_message_ratings_message
  ON public.message_ratings(message_id);

-- ============================================================================
-- RATING RLS
-- ============================================================================

ALTER TABLE public.message_ratings ENABLE ROW LEVEL SECURITY;

-- Service role writes (submit-rating Edge Function uses service key)
CREATE POLICY "Service role can insert ratings"
  ON public.message_ratings FOR INSERT
  WITH CHECK (true);

-- Recipients can view ratings for their messages
CREATE POLICY "Recipients can view ratings for their messages"
  ON public.message_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.escrow_transactions et
      WHERE et.id = message_ratings.transaction_id
      AND et.recipient_user_id = auth.uid()
    )
  );

-- Admin can view all ratings
CREATE POLICY "Admins can view all ratings"
  ON public.message_ratings FOR SELECT
  USING (public.is_admin());

-- ============================================================================
-- RATING COMMENTS
-- ============================================================================

COMMENT ON TABLE public.message_ratings IS
  'Sender ratings for responses — submitted via HMAC-signed magic link in forwarded email';

COMMENT ON COLUMN public.message_ratings.rating_token_hash IS
  'SHA-256 hash of HMAC token — verified by submit-rating Edge Function before accepting rating';

-- ============================================================================
-- PROFILE PERFORMANCE COLUMNS
-- ============================================================================
-- Denormalized stats on profiles for fast reads on payment page + directory

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS response_rate NUMERIC(5,2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avg_response_hours NUMERIC(8,2);

COMMENT ON COLUMN public.profiles.avg_rating IS
  'Average rating (1.00-5.00) from sender feedback — updated by trigger on message_ratings INSERT';

COMMENT ON COLUMN public.profiles.total_ratings IS
  'Total number of ratings received — updated by trigger on message_ratings INSERT';

COMMENT ON COLUMN public.profiles.response_rate IS
  'Percentage of messages responded to (0-100) — updated by trigger on escrow_transactions status change';

COMMENT ON COLUMN public.profiles.avg_response_hours IS
  'Average hours to respond — updated by trigger on escrow_transactions status change';

-- ============================================================================
-- TRIGGER: Update profile rating stats on new rating
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_profile_rating_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_recipient_id UUID;
BEGIN
  -- Get the recipient from the transaction
  SELECT recipient_user_id INTO v_recipient_id
  FROM public.escrow_transactions
  WHERE id = NEW.transaction_id;

  IF v_recipient_id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      avg_rating = (
        SELECT ROUND(AVG(mr.rating)::numeric, 2)
        FROM public.message_ratings mr
        JOIN public.escrow_transactions et ON et.id = mr.transaction_id
        WHERE et.recipient_user_id = v_recipient_id
      ),
      total_ratings = (
        SELECT COUNT(*)
        FROM public.message_ratings mr
        JOIN public.escrow_transactions et ON et.id = mr.transaction_id
        WHERE et.recipient_user_id = v_recipient_id
      )
    WHERE id = v_recipient_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_profile_rating_stats
  AFTER INSERT ON public.message_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_rating_stats();

-- ============================================================================
-- TRIGGER: Update profile response stats on escrow status change
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_profile_response_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only recalculate for terminal status changes
  IF NEW.status IN ('released', 'refunded') THEN
    UPDATE public.profiles
    SET
      response_rate = (
        SELECT ROUND(
          (COUNT(*) FILTER (WHERE status = 'released')::numeric /
           NULLIF(COUNT(*) FILTER (WHERE status IN ('released', 'refunded')), 0)) * 100,
          2
        )
        FROM public.escrow_transactions
        WHERE recipient_user_id = NEW.recipient_user_id
        AND status IN ('released', 'refunded')
      ),
      avg_response_hours = (
        SELECT ROUND(AVG(
          EXTRACT(EPOCH FROM (mr.response_received_at - et.created_at)) / 3600
        )::numeric, 2)
        FROM public.escrow_transactions et
        JOIN public.message_responses mr ON mr.message_id = et.message_id
        WHERE et.recipient_user_id = NEW.recipient_user_id
        AND et.status = 'released'
        AND mr.response_received_at IS NOT NULL
      )
    WHERE id = NEW.recipient_user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_profile_response_stats
  AFTER UPDATE OF status ON public.escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_response_stats();

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Authenticated users can query directory (RLS filters appropriately)
GRANT SELECT ON public.directory_requests TO authenticated;
GRANT SELECT ON public.directory_request_emails TO authenticated;
GRANT SELECT ON public.message_ratings TO authenticated;

-- Admin needs update/insert on directory
GRANT INSERT, UPDATE ON public.directory_requests TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

COMMIT;
