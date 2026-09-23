export type SitemapUrlEntry = {
  url: string
  lastModified?: Date | string
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

function toIso(d: Date | string | undefined): string | null {
  if (!d) return null
  const date = typeof d === 'string' ? new Date(d) : d
  return isNaN(date.getTime()) ? null : date.toISOString()
}

export function buildUrlsetXml(entries: SitemapUrlEntry[]): string {
  const body = entries
    .map(e => {
      const lastmod = toIso(e.lastModified)
      return [
        '  <url>',
        `    <loc>${e.url}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        e.changeFrequency ? `    <changefreq>${e.changeFrequency}</changefreq>` : null,
        e.priority != null ? `    <priority>${e.priority}</priority>` : null,
        '  </url>',
      ].filter(Boolean).join('\n')
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
