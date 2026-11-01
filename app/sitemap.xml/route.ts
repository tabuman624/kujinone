// Vercelは再生成のたびに（内容が同じでも）ISR Writeを計上するため、再生成は1日1回に抑える。
// 日付の切り替わり後の更新は /api/cron/revalidate-changed（毎日12時台）が行う。
export const revalidate = 86400

const BASE = 'https://kujinone.com'

const SUB_SITEMAPS = [
  'sitemap-kuji.xml',
  'sitemap-blog.xml',
  'sitemap-ip.xml',
  'sitemap-store.xml',
  'sitemap-static.xml',
]

// タイプ別に分割したサブサイトマップへのインデックス。
// MetadataRoute.Sitemap(sitemap.ts)はsitemapindex形式を出力できないため、
// feed.xmlと同じ「フォルダ名に.xmlを含むroute.ts」方式で手組みする。
export async function GET() {
  const body = SUB_SITEMAPS
    .map(name => `  <sitemap>\n    <loc>${BASE}/${name}</loc>\n  </sitemap>`)
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
