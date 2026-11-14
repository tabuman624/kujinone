import { supabase } from '../lib/supabase'
import { buildUrlsetXml, xmlResponse } from '../lib/sitemapXml'

// Vercelは再生成のたびに（内容が同じでも）ISR Writeを計上するため、再生成は1日1回に抑える。
// 日付の切り替わり後の更新は /api/cron/revalidate-changed（毎日12時台）が行う。
export const revalidate = 86400

const BASE = 'https://kujinone.com'

export async function GET() {
  const { data: kujiList, error } = await supabase
    .from('kuji')
    .select('id, updated_at, release_at')
    .eq('is_active', true)
    .order('id', { ascending: true })
  if (error) throw new Error(`sitemap-kuji: kuji取得に失敗しました: ${error.message}`)

  // 発売済みで賞品が0件のくじページは noindex にしている（app/kuji/[id]/page.tsx の generateMetadata）ので、
  // sitemap にも載せない。発売前のくじは賞品が0件でも載せる（ラインナップの発表前から検索されるため、2026-11-15）。
  // prizes は1000行を超えるので id 順に区切って取る。
  const kujiWithPrizes = new Set<number>()
  for (let from = 0; ; from += 1000) {
    const { data, error: prizesError } = await supabase
      .from('prizes')
      .select('kuji_id')
      .order('id', { ascending: true })
      .range(from, from + 999)
    if (prizesError) throw new Error(`sitemap-kuji: prizes取得に失敗しました: ${prizesError.message}`)
    for (const p of data ?? []) kujiWithPrizes.add(p.kuji_id as number)
    if (!data || data.length < 1000) break
  }

  // 発売済みかどうかはページと同じ判定（UTCの日付）。発売日が未定のくじは発売前として扱う
  const today = new Date().toISOString().slice(0, 10)
  const isReleased = (k: { release_at: string | null }) => !!k.release_at && k.release_at <= today

  const entries = (kujiList ?? []).filter(k => kujiWithPrizes.has(k.id) || !isReleased(k)).map(k => ({
    url: `${BASE}/kuji/${k.id}`,
    lastModified: k.updated_at ? new Date(k.updated_at) : undefined,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  return xmlResponse(buildUrlsetXml(entries))
}
