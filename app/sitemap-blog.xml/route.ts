import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { buildUrlsetXml, latestOf, xmlResponse } from '../lib/sitemapXml'

// Vercelは再生成のたびに（内容が同じでも）ISR Writeを計上するため、再生成は1日1回に抑える。
// 日付の切り替わり後の更新は /api/cron/revalidate-changed（毎日12時台）が行う。
export const revalidate = 86400

const BASE = 'https://kujinone.com'

export async function GET() {
  const postsDir = path.join(process.cwd(), 'posts')
  const blogFiles = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'))

  const blogPages = blogFiles.map(filename => {
    const slug = filename.replace('.md', '')
    const raw = fs.readFileSync(path.join(postsDir, filename), 'utf-8')
    const { data } = matter(raw)
    return {
      url: `${BASE}/blog/${slug}`,
      lastModified: data.date ? new Date(String(data.date)) : undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }
  })

  const entries = [
    { url: `${BASE}/blog`, lastModified: latestOf(blogPages.map(p => p.lastModified)), changeFrequency: 'weekly' as const, priority: 0.8 },
    ...blogPages,
  ]

  return xmlResponse(buildUrlsetXml(entries))
}
