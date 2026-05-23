import { MetadataRoute } from 'next'
import { supabase } from './lib/supabase'
import fs from 'fs'
import path from 'path'

const BASE = 'https://kujinone.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/schedule`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/calc`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/howto`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/contact`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]

  const postsDir = path.join(process.cwd(), 'posts')
  const slugs = fs.readdirSync(postsDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
  const blogPages: MetadataRoute.Sitemap = slugs.map(slug => ({
    url: `${BASE}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const { data: kujiList } = await supabase.from('kuji').select('id, release_at').eq('is_active', true)
  const kujiPages: MetadataRoute.Sitemap = (kujiList ?? []).map(k => ({
    url: `${BASE}/kuji/${k.id}`,
    lastModified: new Date(k.release_at),
    changeFrequency: 'weekly',
    priority: 0.9,
  }))

  return [...staticPages, ...blogPages, ...kujiPages]
}
