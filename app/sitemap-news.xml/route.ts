import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { buildUrlsetXml, xmlResponse } from '../lib/sitemapXml'

export const revalidate = 3600

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
      lastModified: data.date ? new Date(String(data.date)) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }
  })

  const entries = [
    { url: `${BASE}/news`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    ...newsPages,
  ]

  return xmlResponse(buildUrlsetXml(entries))
}
