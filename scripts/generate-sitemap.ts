/**
 * Sitemap Generator for FastPass
 *
 * This script generates a sitemap.xml file at build time by:
 * 1. Including static routes (home, blog, privacy, etc.)
 * 2. Fetching published blog posts from Supabase
 * 3. Writing the sitemap to public/sitemap.xml
 *
 * Usage: npm run generate-sitemap
 * Or automatically during build: npm run build
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file if present
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

interface BlogPostSitemap {
  slug: string;
  updated_at: string;
}

interface StaticRoute {
  path: string;
  priority: string;
  changefreq: string;
}

async function generateSitemap() {
  const baseUrl = 'https://fastpass.email';
  const today = new Date().toISOString().split('T')[0];

  // Static routes with their priorities
  const staticRoutes: StaticRoute[] = [
    { path: '', priority: '1.0', changefreq: 'weekly' },
    { path: 'auth', priority: '0.8', changefreq: 'monthly' },
    { path: 'blog', priority: '0.9', changefreq: 'weekly' },
    { path: 'privacy', priority: '0.3', changefreq: 'yearly' },
    { path: 'cookie-settings', priority: '0.3', changefreq: 'yearly' },
  ];

  let blogPosts: BlogPostSitemap[] = [];

  // Fetch blog posts from Supabase if credentials are available
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('blog_posts')
        .select('slug, updated_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (error) {
        console.warn('Warning: Could not fetch blog posts:', error.message);
      } else if (data) {
        blogPosts = data as BlogPostSitemap[];
        console.log(`Found ${blogPosts.length} published blog posts`);
      }
    } catch (err) {
      console.warn('Warning: Supabase connection failed:', err);
    }
  } else {
    console.warn('Warning: Supabase credentials not found. Generating sitemap without blog posts.');
  }

  // Generate XML
  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Add static routes
  staticRoutes.forEach((route) => {
    sitemap += '  <url>\n';
    sitemap += `    <loc>${baseUrl}${route.path ? '/' + route.path : ''}</loc>\n`;
    sitemap += `    <lastmod>${today}</lastmod>\n`;
    sitemap += `    <changefreq>${route.changefreq}</changefreq>\n`;
    sitemap += `    <priority>${route.priority}</priority>\n`;
    sitemap += '  </url>\n';
  });

  // Add blog posts
  blogPosts.forEach((post) => {
    const lastmod = post.updated_at
      ? new Date(post.updated_at).toISOString().split('T')[0]
      : today;

    sitemap += '  <url>\n';
    sitemap += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
    sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
    sitemap += '    <changefreq>monthly</changefreq>\n';
    sitemap += '    <priority>0.7</priority>\n';
    sitemap += '  </url>\n';
  });

  sitemap += '</urlset>';

  // Write sitemap to public directory
  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap, 'utf8');

  console.log(`✓ Sitemap generated successfully at ${sitemapPath}`);
  console.log(`  - ${staticRoutes.length} static routes`);
  console.log(`  - ${blogPosts.length} blog posts`);
  console.log(`  - Total: ${staticRoutes.length + blogPosts.length} URLs`);
}

// Run the generator
generateSitemap().catch((err) => {
  console.error('Error generating sitemap:', err);
  process.exit(1);
});
