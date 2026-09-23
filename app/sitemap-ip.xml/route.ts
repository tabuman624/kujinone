import { supabase } from '../lib/supabase'
import { IP_NAMES, ipSlugFor } from '../lib/ipGroups'
import { buildUrlsetXml, xmlResponse } from '../lib/sitemapXml'

export const revalidate = 3600

const BASE = 'https://kujinone.com'

export async function GET() {
  // getIpGroups()はページ描画用（Supabase障害時は空配列フォールバック）のため、
  // ここでは失敗を握りつぶさない独自クエリを行う。
  const { data, error } = await supabase
    .from('kuji')
    .select('product_id, updated_at')
    .eq('is_active', true)
  if (error) throw new Error(`sitemap-ip: kuji取得に失敗しました: ${error.message}`)

  const latestBySlug: Record<string, string> = {}
  for (const k of data ?? []) {
    const slug = ipSlugFor(k.product_id as string)
    if (!IP_NAMES[slug] || !k.updated_at) continue
    if (!latestBySlug[slug] || k.updated_at > latestBySlug[slug]) {
      latestBySlug[slug] = k.updated_at
    }
  }

  const ipPages = Object.keys(latestBySlug).map(slug => ({
    url: `${BASE}/ip/${slug}`,
    lastModified: new Date(latestBySlug[slug]),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  const entries = [
    { url: `${BASE}/ip`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.6 },
    ...ipPages,
  ]

  return xmlResponse(buildUrlsetXml(entries))
}
