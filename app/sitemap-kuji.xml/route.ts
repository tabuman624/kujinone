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
  if (error) throw new Error(`sitemap-kuji: kuji取得に失敗しました: ${error.message}`)

  const entries = (kujiList ?? []).map(k => ({
    url: `${BASE}/kuji/${k.id}`,
    lastModified: k.updated_at ? new Date(k.updated_at) : undefined,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  return xmlResponse(buildUrlsetXml(entries))
}
