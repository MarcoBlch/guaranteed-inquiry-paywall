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
          bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700
          hover:border-green-500/50
          transition-all duration-300 cursor-pointer
          ${featured ? 'h-full' : ''}
        `}
      >
        <CardContent className={`p-6 ${featured ? 'sm:p-8' : ''}`}>
          {/* Category Badge */}
          <Badge
            variant="outline"
            className="mb-3 text-green-500 border-green-500/40 bg-green-500/5"
          >
            {post.category}
          </Badge>

          {/* Title */}
          <h3
            className={`
              text-green-500 font-semibold mb-3 leading-tight
              ${featured ? 'text-xl sm:text-2xl' : 'text-lg'}
            `}
          >
            {post.title}
          </h3>

          {/* Excerpt */}
          <p
            className={`
              text-slate-500 dark:text-slate-400 leading-relaxed mb-4
              ${featured ? 'text-base' : 'text-sm line-clamp-3'}
            `}
          >
            {post.excerpt}
          </p>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500/80 dark:text-slate-400/80">
            {formattedDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-green-500/60" />
                {formattedDate}
              </span>
            )}
            {post.reading_time_minutes && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-green-500/60" />
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
