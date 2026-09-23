import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { buildUrlsetXml, xmlResponse } from '../lib/sitemapXml'

export const revalidate = 3600

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
      lastModified: data.date ? new Date(String(data.date)) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }
  })

  const entries = [
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    ...blogPages,
  ]

  return xmlResponse(buildUrlsetXml(entries))
}
