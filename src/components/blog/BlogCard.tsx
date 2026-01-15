import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import type { BlogPostPreview } from '@/types/blog';

interface BlogCardProps {
  post: BlogPostPreview;
  featured?: boolean;
}

export const BlogCard = ({ post, featured = false }: BlogCardProps) => {
  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <Link to={`/blog/${post.slug}`}>
      <Card
        className={`
          bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20
          shadow-[0_0_15px_rgba(92,255,176,0.15)]
          hover:border-[#5cffb0]/50 hover:shadow-[0_0_25px_rgba(92,255,176,0.25)]
          transition-all duration-300 cursor-pointer
          ${featured ? 'h-full' : ''}
        `}
      >
        <CardContent className={`p-6 ${featured ? 'sm:p-8' : ''}`}>
          {/* Category Badge */}
          <Badge
            variant="outline"
            className="mb-3 text-[#5cffb0] border-[#5cffb0]/40 bg-[#5cffb0]/5"
          >
            {post.category}
          </Badge>

          {/* Title */}
          <h3
            className={`
              text-[#5cffb0] font-semibold mb-3 leading-tight
              ${featured ? 'text-xl sm:text-2xl' : 'text-lg'}
            `}
          >
            {post.title}
          </h3>

          {/* Excerpt */}
          <p
            className={`
              text-[#B0B0B0] leading-relaxed mb-4
              ${featured ? 'text-base' : 'text-sm line-clamp-3'}
            `}
          >
            {post.excerpt}
          </p>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#B0B0B0]/80">
            {formattedDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#5cffb0]/60" />
                {formattedDate}
              </span>
            )}
            {post.reading_time_minutes && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#5cffb0]/60" />
                {post.reading_time_minutes} min read
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default BlogCard;
