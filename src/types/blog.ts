/**
 * Blog post types for SEO content marketing
 */

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  structured_data: Record<string, unknown> | Record<string, unknown>[] | null;
  category: string;
  tags: string[] | null;
  author_name: string;
  reading_time_minutes: number | null;
  is_published: boolean;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  view_count: number;
}

export interface BlogPostPreview {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[] | null;
  author_name: string;
  reading_time_minutes: number | null;
  published_at: string | null;
  is_featured: boolean;
  og_image: string | null;
}

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
  noIndex?: boolean;
}
