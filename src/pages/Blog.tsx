import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FastPassLogo } from '@/components/ui/FastPassLogo';
import { usePageViewTracking } from '@/hooks/usePageViewTracking';
import { useSEO } from '@/hooks/useSEO';
import { BlogCard } from '@/components/blog/BlogCard';
import { ArrowLeft } from 'lucide-react';
import type { BlogPostPreview } from '@/types/blog';

const Blog = () => {
  // Track page view for analytics
  usePageViewTracking('/blog');

  // Apply SEO meta tags for blog index
  useSEO({
    title: 'Blog | FastPass - Pay-to-Reach Insights',
    description:
      'Learn about pay-to-reach, inbox monetization, and the attention economy. Tips and guides for creators, founders, and professionals.',
    keywords: [
      'pay-to-reach blog',
      'monetize inbox',
      'creator economy',
      'attention economy',
      'email monetization',
    ],
    ogTitle: 'FastPass Blog',
    ogDescription: 'Insights on pay-to-reach and inbox monetization for creators and professionals.',
    ogImage: '/og-image.png',
    canonicalUrl: 'https://fastpass.email/blog',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'FastPass Blog',
      description: 'Insights on pay-to-reach and inbox monetization',
      url: 'https://fastpass.email/blog',
      publisher: {
        '@type': 'Organization',
        name: 'FastPass',
        logo: {
          '@type': 'ImageObject',
          url: 'https://fastpass.email/logo-final-optimized-final.png',
        },
      },
    },
  });

  // Fetch blog posts
  const { data: posts, isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(
          'id, slug, title, excerpt, category, tags, author_name, reading_time_minutes, published_at, is_featured, og_image'
        )
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data as BlogPostPreview[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const featuredPosts = posts?.filter((p) => p.is_featured) || [];
  const regularPosts = posts?.filter((p) => !p.is_featured) || [];

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
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
          {/* Back Button */}
          <Button
            asChild
            variant="ghost"
            className="mb-6 text-[#5cffb0] hover:text-[#4de89d] hover:bg-[#5cffb0]/10"
          >
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>

          {/* Page Title */}
          <h1 className="text-[#5cffb0] text-4xl sm:text-5xl font-bold mb-4">Blog</h1>
          <p className="text-[#B0B0B0] text-lg mb-12 max-w-2xl">
            Insights on pay-to-reach, inbox monetization, and the attention economy. Learn how
            creators and professionals are taking control of their inboxes.
          </p>

          {isLoading ? (
            // Loading skeleton
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <Card
                  key={i}
                  className="bg-[#1a1f2e]/90 border border-[#5cffb0]/20 animate-pulse"
                >
                  <CardContent className="p-6">
                    <div className="h-6 bg-[#5cffb0]/20 rounded mb-4 w-3/4" />
                    <div className="h-4 bg-[#5cffb0]/10 rounded mb-2" />
                    <div className="h-4 bg-[#5cffb0]/10 rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Featured Posts */}
              {featuredPosts.length > 0 && (
                <section className="mb-12">
                  <h2 className="text-[#5cffb0] text-2xl font-semibold mb-6">Featured</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {featuredPosts.map((post) => (
                      <BlogCard key={post.id} post={post} featured />
                    ))}
                  </div>
                </section>
              )}

              {/* All Posts */}
              {regularPosts.length > 0 && (
                <section>
                  <h2 className="text-[#5cffb0] text-2xl font-semibold mb-6">All Articles</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {regularPosts.map((post) => (
                      <BlogCard key={post.id} post={post} />
                    ))}
                  </div>
                </section>
              )}

              {/* Empty state */}
              {posts?.length === 0 && (
                <Card className="bg-[#1a1f2e]/90 border border-[#5cffb0]/20">
                  <CardContent className="p-8 text-center">
                    <p className="text-[#B0B0B0]">No blog posts yet. Check back soon!</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
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
              to="/"
              className="text-[#5cffb0] hover:text-[#4de89d] hover:underline transition-colors"
            >
              Home
            </Link>
          </div>
          <p>&copy; 2025 FastPass | Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default Blog;
