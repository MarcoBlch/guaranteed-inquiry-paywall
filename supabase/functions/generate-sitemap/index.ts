import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SITE_URL = 'https://fastpass.email'

// Static pages with their priorities and change frequencies
const STATIC_PAGES: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/directory', priority: '0.9', changefreq: 'daily' },
  { path: '/blog', priority: '0.9', changefreq: 'weekly' },
  { path: '/faq', priority: '0.7', changefreq: 'monthly' },
  { path: '/auth', priority: '0.6', changefreq: 'monthly' },
  { path: '/solution-unsolicited-dm', priority: '0.8', changefreq: 'monthly' },
  { path: '/terms', priority: '0.4', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/cookie-settings', priority: '0.3', changefreq: 'yearly' },
]

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const today = formatDate(new Date())

    // Fetch published blog posts and active directory entries in parallel
    const [blogResult, directoryResult] = await Promise.all([
      supabase
        .from('blog_posts')
        .select('slug, published_at, updated_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false }),
      supabase
        .from('directory_requests')
        .select('target_slug, updated_at')
        .eq('status', 'active')
        .order('request_count', { ascending: false }),
    ])

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    // Static pages
    for (const page of STATIC_PAGES) {
      xml += '  <url>\n'
      xml += `    <loc>${SITE_URL}${page.path}</loc>\n`
      xml += `    <lastmod>${today}</lastmod>\n`
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`
      xml += `    <priority>${page.priority}</priority>\n`
      xml += '  </url>\n'
    }

    // Blog posts
    if (blogResult.data) {
      for (const post of blogResult.data) {
        const lastmod = formatDate(post.updated_at || post.published_at)
        xml += '  <url>\n'
        xml += `    <loc>${SITE_URL}/blog/${escapeXml(post.slug)}</loc>\n`
        xml += `    <lastmod>${lastmod}</lastmod>\n`
        xml += '    <changefreq>monthly</changefreq>\n'
        xml += '    <priority>0.7</priority>\n'
        xml += '  </url>\n'
      }
    }

    // Directory profiles (active only)
    // These are not individual pages yet, but including them
    // improves the sitemap completeness for future /directory/:slug routes

    xml += '</urlset>'

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error: any) {
    console.error('Sitemap generation error:', error)

    // Fallback: return a minimal sitemap so Google never gets a 500
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://fastpass.email</loc>
    <priority>1.0</priority>
  </url>
</urlset>`

    return new Response(fallback, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})
