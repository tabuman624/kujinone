import { supabase } from '../lib/supabase'
import { storeSlugsFor } from '../lib/storeGroups'
import { buildUrlsetXml, xmlResponse } from '../lib/sitemapXml'

export const revalidate = 3600

const BASE = 'https://kujinone.com'

export async function GET() {
  // getStoreGroups()はページ描画用（Supabase障害時は空配列フォールバック）のため、
  // ここでは失敗を握りつぶさない独自クエリを行う。
  const { data, error } = await supabase
    .from('kuji')
    .select('available_stores, updated_at')
    .eq('is_active', true)
  if (error) throw new Error(`sitemap-store: kuji取得に失敗しました: ${error.message}`)

  const latestBySlug: Record<string, string> = {}
  for (const k of data ?? []) {
    if (!k.updated_at) continue
    const stores: string[] = Array.isArray(k.available_stores) ? k.available_stores : []
    for (const slug of storeSlugsFor(stores)) {
      if (!latestBySlug[slug] || k.updated_at > latestBySlug[slug]) {
        latestBySlug[slug] = k.updated_at
      }
    }
  }

  const storePages = Object.keys(latestBySlug).map(slug => ({
    url: `${BASE}/store/${slug}`,
    lastModified: new Date(latestBySlug[slug]),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  const entries = [
    { url: `${BASE}/store`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.5 },
    ...storePages,
  ]

  return xmlResponse(buildUrlsetXml(entries))
}
