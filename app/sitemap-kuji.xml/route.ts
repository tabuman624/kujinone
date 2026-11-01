import { supabase } from '../lib/supabase'
import { buildUrlsetXml, xmlResponse } from '../lib/sitemapXml'

// Vercelは再生成のたびに（内容が同じでも）ISR Writeを計上するため、再生成は1日1回に抑える。
// 日付の切り替わり後の更新は /api/cron/revalidate-changed（毎日12時台）が行う。
export const revalidate = 86400

const BASE = 'https://kujinone.com'

export async function GET() {
  const { data: kujiList, error } = await supabase
    .from('kuji')
    .select('id, updated_at')
    .eq('is_active', true)
    .order('id', { ascending: true })
  if (error) throw new Error(`sitemap-kuji: kuji取得に失敗しました: ${error.message}`)

  // 賞品が0件のくじページは noindex にしている（app/kuji/[id]/page.tsx の generateMetadata）ので、
  // sitemap にも載せない。賞品が登録されると、毎日の revalidate-changed でこの sitemap も再生成され自動で戻る。
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

  const entries = (kujiList ?? []).filter(k => kujiWithPrizes.has(k.id)).map(k => ({
    url: `${BASE}/kuji/${k.id}`,
    lastModified: k.updated_at ? new Date(k.updated_at) : undefined,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  return xmlResponse(buildUrlsetXml(entries))
}
