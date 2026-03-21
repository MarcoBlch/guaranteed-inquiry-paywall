import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/generate-sitemap`
    )

    if (!response.ok) {
      throw new Error(`Supabase returned ${response.status}`)
    }

    const xml = await response.text()

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')
    res.status(200).send(xml)
  } catch (error) {
    // Fallback minimal sitemap
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://fastpass.email</loc><priority>1.0</priority></url>
  <url><loc>https://fastpass.email/directory</loc><priority>0.9</priority></url>
  <url><loc>https://fastpass.email/blog</loc><priority>0.9</priority></url>
</urlset>`

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.status(200).send(fallback)
  }
}
