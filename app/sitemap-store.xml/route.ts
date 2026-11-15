import { supabase } from '../lib/supabase'
import { INDEXED_STORE_SLUGS, storeSlugsFor } from '../lib/storeGroups'
import { buildUrlsetXml, latestOf, xmlResponse } from '../lib/sitemapXml'

// Vercelは再生成のたびに（内容が同じでも）ISR Writeを計上するため、再生成は1日1回に抑える。
// 日付の切り替わり後の更新は /api/cron/revalidate-changed（毎日0時台）が行う。
export const revalidate = 86400

const BASE = 'https://kujinone.com'

// 載せるのは /store と、検索に出している取扱店ページ（INDEXED_STORE_SLUGS、2026-11-15に一部を検索に戻した）。
// noindex のページ（書店・ホビーショップ・公式ショップ）を載せると矛盾したシグナルになるため載せない。
export async function GET() {
  // getStoreGroups()はページ描画用（Supabase障害時は空配列フォールバック）のため、
  // ここでは失敗を握りつぶさない独自クエリを行う（sitemap-kuji.xml参照）。
  const { data, error } = await supabase
    .from('kuji')
    .select('available_stores, updated_at')
    .eq('is_active', true)
  if (error) throw new Error(`sitemap-store: kuji取得に失敗しました: ${error.message}`)

  // lastmodは各店のくじの最終更新日時
  const latestBySlug: Record<string, string> = {}
  for (const k of data ?? []) {
    if (!k.updated_at) continue
    const stores: string[] = Array.isArray(k.available_stores) ? k.available_stores : []
    for (const slug of storeSlugsFor(stores)) {
      if (!latestBySlug[slug] || k.updated_at > latestBySlug[slug]) latestBySlug[slug] = k.updated_at
    }
  }

  const storePages = INDEXED_STORE_SLUGS.filter(slug => latestBySlug[slug]).map(slug => ({
    url: `${BASE}/store/${slug}`,
    lastModified: new Date(latestBySlug[slug]),
    changeFrequency: 'daily' as const,
    priority: 0.5,
  }))

  const entries = [
    { url: `${BASE}/store`, lastModified: latestOf(Object.values(latestBySlug)), changeFrequency: 'daily' as const, priority: 0.5 },
    ...storePages,
  ]

  return xmlResponse(buildUrlsetXml(entries))
}
