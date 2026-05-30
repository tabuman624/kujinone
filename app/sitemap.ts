import { MetadataRoute } from 'next'
import { supabase } from './lib/supabase'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const BASE = 'https://kujinone.com'

// 1時間ごとにサイトマップを再生成（Supabaseの変更を反映）
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/schedule`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/calc`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/news`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/howto`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/contact`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]

  const postsDir = path.join(process.cwd(), 'posts')
  const blogFiles = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'))
  const blogPages: MetadataRoute.Sitemap = blogFiles.map(filename => {
    const slug = filename.replace('.md', '')
    const raw = fs.readFileSync(path.join(postsDir, filename), 'utf-8')
    const { data } = matter(raw)
    const lastMod = data.date ? new Date(String(data.date)) : new Date()
    return {
      url: `${BASE}/blog/${slug}`,
      lastModified: lastMod,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }
  })

  const newsDir = path.join(process.cwd(), 'news-posts')
  const newsFiles = fs.existsSync(newsDir)
    ? fs.readdirSync(newsDir).filter(f => f.endsWith('.md'))
    : []
  const newsPages: MetadataRoute.Sitemap = newsFiles.map(filename => {
    const slug = filename.replace('.md', '')
    const raw = fs.readFileSync(path.join(newsDir, filename), 'utf-8')
    const { data } = matter(raw)
    const lastMod = data.date ? new Date(String(data.date)) : new Date()
    return {
      url: `${BASE}/news/${slug}`,
      lastModified: lastMod,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }
  })

  let kujiPages: MetadataRoute.Sitemap = []
  try {
    const { data: kujiList, error } = await supabase.from('kuji').select('id, release_at').eq('is_active', true)
    if (!error && kujiList) {
      kujiPages = kujiList.map(k => ({
        url: `${BASE}/kuji/${k.id}`,
        lastModified: new Date(k.release_at),
        changeFrequency: 'weekly' as const,
        priority: 0.9,
      }))
    }
  } catch {
    // Supabase エラー時はくじページをサイトマップから除外して他ページは正常に返す
  }

  return [...staticPages, ...blogPages, ...newsPages, ...kujiPages]
}
