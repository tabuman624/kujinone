import { supabase } from '../lib/supabase'
import { buildUrlsetXml, xmlResponse } from '../lib/sitemapXml'

export const revalidate = 3600

const BASE = 'https://kujinone.com'

// /store/[slug]はnoindexにした（3か月表示0、/scheduleの部分集合。ADSENSE_SPEC
// 「薄いページのnoindex化」判断）。noindexページをsitemapに載せると矛盾した
// シグナルになるため、/store一覧のみを残す。
export async function GET() {
  // lastmodは掲載データ（kuji）の最終更新日時。sitemap系は取得失敗時にthrowする方針（sitemap-kuji.xml参照）。
  const { data: latest, error } = await supabase
    .from('kuji')
    .select('updated_at')
    .eq('is_active', true)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
  if (error) throw new Error(`sitemap-store: kuji取得に失敗しました: ${error.message}`)

  const entries = [
    { url: `${BASE}/store`, lastModified: latest?.[0]?.updated_at ?? undefined, changeFrequency: 'daily' as const, priority: 0.5 },
  ]

  return xmlResponse(buildUrlsetXml(entries))
}
