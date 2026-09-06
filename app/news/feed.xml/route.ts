import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export const revalidate = 3600

const BASE = 'https://kujinone.com'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toRfc822(dateStr: string): string {
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString()
}

export async function GET() {
  const dir = path.join(process.cwd(), 'news-posts')
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.md')) : []

  const items = files
    .map(filename => {
      const slug = filename.replace('.md', '')
      const raw = fs.readFileSync(path.join(dir, filename), 'utf-8')
      const { data } = matter(raw)
      return {
        slug,
        title: String(data.title || ''),
        date: String(data.date || ''),
        summary: String(data.summary || ''),
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50)

  // 全文でなくsummaryのみ配信する（無断転載対策、本文はサイト側で読んでもらう）
  const itemsXml = items
    .map(item => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${BASE}/news/${item.slug}</link>
      <guid isPermaLink="true">${BASE}/news/${item.slug}</guid>
      <pubDate>${toRfc822(item.date)}</pubDate>
      <description>${escapeXml(item.summary)}</description>
    </item>`)
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>くじのね - 一番くじ新作速報</title>
    <link>${BASE}/news</link>
    <description>一番くじの新作・発売予定情報をいち早くお届け</description>
    <language>ja</language>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${BASE}/news/feed.xml" rel="self" type="application/rss+xml" />${itemsXml}
  </channel>
</rss>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
