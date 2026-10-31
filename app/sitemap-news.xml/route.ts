import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { buildUrlsetXml, latestOf, xmlResponse } from '../lib/sitemapXml'

// Vercelは再生成のたびに（内容が同じでも）ISR Writeを計上するため、再生成は1日1回に抑える。
// 日付の切り替わり後の更新は /api/cron/revalidate-changed（毎朝9時台）が行う。
export const revalidate = 86400

const BASE = 'https://kujinone.com'

export async function GET() {
  const newsDir = path.join(process.cwd(), 'news-posts')
  const newsFiles = fs.existsSync(newsDir)
    ? fs.readdirSync(newsDir).filter(f => f.endsWith('.md'))
    : []

  const newsPages = newsFiles.map(filename => {
    const slug = filename.replace('.md', '')
    const raw = fs.readFileSync(path.join(newsDir, filename), 'utf-8')
    const { data } = matter(raw)
    return {
      url: `${BASE}/news/${slug}`,
      lastModified: data.date ? new Date(String(data.date)) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }
  })

  const entries = [
    { url: `${BASE}/news`, lastModified: latestOf(newsPages.map(p => p.lastModified)), changeFrequency: 'daily' as const, priority: 0.9 },
    ...newsPages,
  ]

  return xmlResponse(buildUrlsetXml(entries))
}
