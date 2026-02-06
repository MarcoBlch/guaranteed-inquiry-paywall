-- ============================================================================
-- INVITATION EMAIL REQUESTS TABLE
-- ============================================================================
-- Purpose: Capture email addresses from users requesting beta invitations
-- Related: Works alongside existing invite_codes system
-- Privacy: No IP addresses stored (follows page_views pattern)
-- Future: Designed for automated Postmark email distribution (Phase 2)
-- ============================================================================

-- ============================================================================
-- TABLE: invitation_email_requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invitation_email_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email (unique, case-insensitive)
  email VARCHAR(255) NOT NULL,

  -- Status workflow
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'invited', 'rejected')),

  -- Metadata
  request_source VARCHAR(50) DEFAULT 'landing_page',

  -- Admin tracking (for Phase 2 automation)
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_notes TEXT,
  invite_code_sent UUID REFERENCES public.invite_codes(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Unique email constraint (case-insensitive)
CREATE UNIQUE INDEX idx_invitation_requests_email_unique
  ON public.invitation_email_requests(LOWER(email));

-- Status filtering (for admin queries)
CREATE INDEX idx_invitation_requests_status
  ON public.invitation_email_requests(status);

-- Created date (chronological admin review)
CREATE INDEX idx_invitation_requests_created_at
  ON public.invitation_email_requests(created_at DESC);

-- Admin tracking
CREATE INDEX idx_invitation_requests_reviewed_by
  ON public.invitation_email_requests(reviewed_by)
  WHERE reviewed_by IS NOT NULL;

-- Invite code tracking (for Phase 2 automation)
CREATE INDEX idx_invitation_requests_invite_code
  ON public.invitation_email_requests(invite_code_sent)
  WHERE invite_code_sent IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.invitation_email_requests IS
  'Email addresses from users requesting beta invitations - admin-only access';

COMMENT ON COLUMN public.invitation_email_requests.email IS
  'Email address (stored lowercase, unique constraint)';

COMMENT ON COLUMN public.invitation_email_requests.status IS
  'Request status: pending (new) → approved (admin reviewed) → invited (code sent) or rejected';

COMMENT ON COLUMN public.invitation_email_requests.request_source IS
  'Where the request originated (e.g., landing_page, blog_cta)';

COMMENT ON COLUMN public.invitation_email_requests.invite_code_sent IS
  'FK to invite_codes table when invitation is sent (Phase 2 automation)';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.invitation_email_requests ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT
CREATE POLICY "Admins can view all invitation requests"
  ON public.invitation_email_requests FOR SELECT
  USING (public.is_admin());

-- Admin-only UPDATE
CREATE POLICY "Admins can update invitation requests"
  ON public.invitation_email_requests FOR UPDATE
  USING (public.is_admin());

-- Service role can INSERT (Edge Function with service_role key)
CREATE POLICY "Service role can insert invitation requests"
  ON public.invitation_email_requests FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger (using existing function from initial migrations)
CREATE TRIGGER update_invitation_requests_updated_at
  BEFORE UPDATE ON public.invitation_email_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Allow authenticated users to query (RLS will filter to admins only)
GRANT SELECT ON public.invitation_email_requests TO authenticated;

-- Service role needs full access for Edge Function
-- (Already has full access via service_role, no explicit grant needed)

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
