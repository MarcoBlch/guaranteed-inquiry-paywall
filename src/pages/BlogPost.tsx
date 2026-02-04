import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FastPassLogo } from '@/components/ui/FastPassLogo';
import { usePageViewTracking } from '@/hooks/usePageViewTracking';
import { useSEO } from '@/hooks/useSEO';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import DOMPurify from 'dompurify';
import type { BlogPost as BlogPostType } from '@/types/blog';

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();

  // Track page view for analytics
  usePageViewTracking(`/blog/${slug}`);

  // Fetch blog post by slug
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      return data as BlogPostType;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !!slug,
  });

  // Apply SEO meta tags (dynamic based on post content)
  useSEO({
    title: post?.meta_title || post?.title || 'Loading... | FastPass Blog',
    description: post?.meta_description || post?.excerpt || '',
    keywords: post?.meta_keywords || undefined,
    ogTitle: post?.og_title || post?.title,
    ogDescription: post?.og_description || post?.excerpt,
    ogImage: post?.og_image || '/og-image.png',
    ogType: 'article',
    canonicalUrl: `https://fastpass.email/blog/${slug}`,
    structuredData: post?.structured_data || undefined,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-[#5cffb0] text-lg">Loading article...</div>
        </div>
      </div>
    );
  }

  // Error/Not found state
  if (error || !post) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
          <h1 className="text-[#5cffb0] text-6xl font-bold mb-4">404</h1>
          <p className="text-[#B0B0B0] text-lg mb-8">Blog post not found</p>
          <Button
            asChild
            className="bg-[#5cffb0] text-[#0a0e1a] hover:bg-[#4de89d] font-semibold"
          >
            <Link to="/blog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Format the published date
  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  // Sanitize HTML content to prevent XSS
  const sanitizedContent = DOMPurify.sanitize(post.content, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'a', 'ul', 'ol', 'li',
      'strong', 'em', 'b', 'i',
      'blockquote', 'code', 'pre',
      'div', 'span', 'article', 'section',
      'br', 'hr',
    ],
    ALLOWED_ATTR: ['href', 'class', 'id', 'target', 'rel'],
  });

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 sm:p-6 text-center border-b border-[#5cffb0]/20">
          <Link to="/">
            <FastPassLogo size="md" />
          </Link>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
          {/* Back Button */}
          <Button
            asChild
            variant="ghost"
            className="mb-6 text-[#5cffb0] hover:text-[#4de89d] hover:bg-[#5cffb0]/10"
          >
            <Link to="/blog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Link>
          </Button>

          {/* Article Header */}
          <header className="mb-8">
            <Badge
              variant="outline"
              className="mb-4 text-[#5cffb0] border-[#5cffb0]/40 bg-[#5cffb0]/5"
            >
              {post.category}
            </Badge>

            <h1 className="text-[#5cffb0] text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#B0B0B0]">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#5cffb0]/60" />
                {post.author_name}
              </span>
              {formattedDate && (
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#5cffb0]/60" />
                  {formattedDate}
                </span>
              )}
              {post.reading_time_minutes && (
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#5cffb0]/60" />
                  {post.reading_time_minutes} min read
                </span>
              )}
            </div>
          </header>

          {/* Article Content */}
          <Card className="bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/30 shadow-[0_0_20px_rgba(92,255,176,0.2)]">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <article
                className="
                  prose prose-invert prose-lg max-w-none
                  prose-headings:text-[#5cffb0] prose-headings:font-semibold
                  prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                  prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                  prose-p:text-[#B0B0B0] prose-p:leading-relaxed prose-p:mb-4
                  prose-a:text-[#5cffb0] prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-[#5cffb0] prose-strong:font-semibold
                  prose-ul:text-[#B0B0B0] prose-ol:text-[#B0B0B0]
                  prose-li:my-2 prose-li:leading-relaxed
                  prose-blockquote:border-l-[#5cffb0] prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-blockquote:text-[#B0B0B0]/80 prose-blockquote:italic
                  prose-code:text-[#5cffb0] prose-code:bg-[#0a0e1a]/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                  [&_.lead]:text-lg [&_.lead]:text-[#B0B0B0] [&_.lead]:leading-relaxed [&_.lead]:mb-6
                  [&_.faq-section]:mt-8 [&_.faq-section]:space-y-6
                  [&_.faq-item]:bg-[#0a0e1a]/30 [&_.faq-item]:p-4 [&_.faq-item]:rounded-lg [&_.faq-item]:border [&_.faq-item]:border-[#5cffb0]/20
                  [&_.faq-item_h3]:text-[#5cffb0] [&_.faq-item_h3]:text-lg [&_.faq-item_h3]:font-semibold [&_.faq-item_h3]:mb-2 [&_.faq-item_h3]:mt-0
                  [&_.faq-item_p]:text-[#B0B0B0] [&_.faq-item_p]:mb-0
                "
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              />
            </CardContent>
          </Card>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-[#5cffb0]/10 text-[#5cffb0] border-none text-xs"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* CTA Section */}
          <Card className="mt-12 bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/30">
            <CardContent className="p-6 sm:p-8 text-center">
              <h2 className="text-[#5cffb0] text-2xl font-semibold mb-4">
                Ready to monetize your inbox?
              </h2>
              <p className="text-[#B0B0B0] mb-6 max-w-lg mx-auto">
                Join thousands of creators and professionals earning from every response. Set your
                price and start getting paid for your attention.
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 hover:shadow-[0_0_25px_rgba(92,255,176,0.5)]"
              >
                <Link to="/auth">Get Started Free</Link>
              </Button>
            </CardContent>
          </Card>
        </main>

        {/* Footer */}
        <footer className="text-center py-8 text-white/60 text-sm border-t border-[#5cffb0]/20">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <Link
              to="/privacy"
              className="text-[#5cffb0] hover:text-[#4de89d] hover:underline transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="hidden sm:inline text-white/40">|</span>
            <Link
              to="/blog"
              className="text-[#5cffb0] hover:text-[#4de89d] hover:underline transition-colors"
            >
              Blog
            </Link>
            <span className="hidden sm:inline text-white/40">|</span>
            <Link
              to="/"
              className="text-[#5cffb0] hover:text-[#4de89d] hover:underline transition-colors"
            >
              Home
            </Link>
          </div>
          <p>&copy; 2026 FastPass | Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default BlogPost;
