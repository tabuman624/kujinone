import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    // カレンダーに追加するためのルート（押されたときだけ動く）は、クローラーに読ませない（2026-11-15）
    rules: { userAgent: '*', allow: '/', disallow: ['/kuji/*/calendar.ics', '/kuji/*/google-calendar'] },
    sitemap: 'https://kujinone.com/sitemap.xml',
  }
}
