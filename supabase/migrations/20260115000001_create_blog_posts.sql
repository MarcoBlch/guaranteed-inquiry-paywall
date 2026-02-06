-- ============================================================
-- BLOG: Create blog_posts table for SEO content marketing
-- ============================================================

-- Create blog_posts table with SEO-optimized fields
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  published_at TIMESTAMPTZ,

  -- URL and identification
  slug TEXT NOT NULL UNIQUE,

  -- Content
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,  -- Short description for cards/previews
  content TEXT NOT NULL,  -- HTML content (sanitized on frontend)

  -- SEO Meta Tags
  meta_title TEXT,         -- Falls back to title if null
  meta_description TEXT,   -- Falls back to excerpt if null
  meta_keywords TEXT[],    -- Array of keywords for SEO

  -- Open Graph / Social Sharing
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,

  -- Structured Data (JSON-LD for rich search results)
  structured_data JSONB,   -- Article schema, FAQ schema, etc.

  -- Categorization
  category TEXT DEFAULT 'general',
  tags TEXT[],

  -- Content metadata
  author_name TEXT DEFAULT 'FastPass Team',
  reading_time_minutes INTEGER,

  -- Status flags
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,

  -- Analytics
  view_count INTEGER DEFAULT 0
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON public.blog_posts(is_featured, published_at DESC) WHERE is_published = true;

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read published posts (critical for SEO crawlers)
CREATE POLICY "blog_posts_public_read" ON public.blog_posts
  FOR SELECT
  USING (is_published = true);

-- Policy: Admins can do everything (CRUD)
CREATE POLICY "blog_posts_admin_all" ON public.blog_posts
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Grant permissions
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER blog_posts_updated_at_trigger
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_updated_at();

-- Add table comment for documentation
COMMENT ON TABLE public.blog_posts IS 'SEO-optimized blog posts for content marketing. Public read access for search engine crawlers.';
COMMENT ON COLUMN public.blog_posts.structured_data IS 'JSON-LD structured data for Article, FAQ, or other schemas to enable rich search results';
COMMENT ON COLUMN public.blog_posts.meta_keywords IS 'SEO keywords array for meta tag generation';
