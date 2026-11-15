import { supabase } from '../../../lib/supabase'
import { buildCalendar, icsResponse, type CalendarKuji } from '../../../lib/ics'

// 発売前のくじページの「カレンダーに追加（iPhone）」から開く、そのくじの発売日だけの予定（2026-11-15）。
// iPhone では開くと「カレンダーに追加」の画面が出る。押されたときだけ動く（ISRの再生成はしない）。
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) return new Response('Not Found', { status: 404 })
  const { data } = await supabase
    .from('kuji')
    .select('id, title, price, release_at, available_stores, updated_at')
    .eq('id', Number(id))
    .maybeSingle()
  if (!data?.release_at) return new Response('Not Found', { status: 404 })
  return icsResponse(buildCalendar([data as CalendarKuji], '一番くじ 発売日'), `kuji-${id}.ics`)
}
