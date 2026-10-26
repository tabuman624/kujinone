import { supabase } from '../lib/supabase'
import { buildUrlsetXml, xmlResponse } from '../lib/sitemapXml'

export const revalidate = 3600

const BASE = 'https://kujinone.com'
const STATIC_DATE = new Date('2026-05-01')

export async function GET() {
  // データ連動ページのlastmodは、レンダー時刻ではくじデータの最終更新日時を使う
  // （ISR再生成のたびに内容が変わるのを防ぐため。latestOfのコメント参照）。
  // sitemap系は取得失敗時にthrowする方針（sitemap-kuji.xml参照）。
  const { data: latest, error } = await supabase
    .from('kuji')
    .select('updated_at')
    .eq('is_active', true)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
  if (error) throw new Error(`sitemap-static: kuji取得に失敗しました: ${error.message}`)
  const dataUpdatedAt = latest?.[0]?.updated_at ?? undefined
  const entries = [
    { url: BASE, lastModified: dataUpdatedAt, changeFrequency: 'daily' as const, priority: 1 },
    { url: `${BASE}/schedule`, lastModified: dataUpdatedAt, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${BASE}/calc`, lastModified: dataUpdatedAt, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${BASE}/today`, lastModified: dataUpdatedAt, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE}/ranking/wanted`, lastModified: dataUpdatedAt, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${BASE}/about`, lastModified: STATIC_DATE, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${BASE}/method`, lastModified: dataUpdatedAt, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${BASE}/howto`, lastModified: STATIC_DATE, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: STATIC_DATE, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: STATIC_DATE, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${BASE}/contact`, lastModified: STATIC_DATE, changeFrequency: 'yearly' as const, priority: 0.3 },
  ]
  return xmlResponse(buildUrlsetXml(entries))
}
