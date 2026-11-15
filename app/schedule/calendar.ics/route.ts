import { supabase } from '../../lib/supabase'
import { todayJst } from '../../lib/jst'
import { buildCalendar, icsResponse, type CalendarKuji } from '../../lib/ics'

// 発売予定を購読するカレンダー（/schedule の「カレンダーに登録」から使う）。2026-11-15。
// 再生成は1日1回。日付の切り替わりと新作の追加は /api/cron/revalidate-changed が更新する。
export const revalidate = 86400

// 発売済みのくじも少し残す。購読したカレンダーは配信の中身に合わせて予定を消すため、
// 発売日を過ぎてすぐ消えないようにする。
const KEEP_PAST_DAYS = 60

export async function GET() {
  const since = new Date(`${todayJst()}T00:00:00Z`)
  since.setUTCDate(since.getUTCDate() - KEEP_PAST_DAYS)
  const { data, error } = await supabase
    .from('kuji')
    .select('id, title, price, release_at, available_stores, updated_at')
    .eq('is_active', true)
    .gte('release_at', since.toISOString().slice(0, 10))
    .order('release_at', { ascending: true })
    .order('id', { ascending: true })
  // 取得に失敗したときは空のカレンダーを返さない。空を返すと、購読している人のカレンダーから予定が全部消えるため
  // （sitemap と同じく、失敗はエラーにする）。
  if (error) throw new Error(`calendar.ics: kuji取得に失敗しました: ${error.message}`)

  const body = buildCalendar((data ?? []) as CalendarKuji[], '一番くじ 発売予定（くじのね）')
  return icsResponse(body, 'kujinone-schedule.ics')
}
