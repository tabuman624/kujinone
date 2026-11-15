import { supabase } from '../../../lib/supabase'
import { googleCalendarEventUrl, type CalendarKuji } from '../../../lib/ics'

// 「カレンダーに追加」の Google を押したときに、Google カレンダーの予定作成画面へ移す（2026-11-15）。
// リンク先のURL（予定の名前・メモ入り）をページに直接書くと、スケジュールのくじ1件ごとに長いURLがHTMLに入るため、
// ページにはくじのIDだけを置き、ここで組み立てる。押されたときだけ動く。
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) return new Response('Not Found', { status: 404 })
  const { data } = await supabase
    .from('kuji')
    .select('id, title, price, release_at, available_stores, updated_at')
    .eq('id', Number(id))
    .maybeSingle()
  if (!data?.release_at) return new Response('Not Found', { status: 404 })
  return Response.redirect(googleCalendarEventUrl(data as CalendarKuji), 302)
}
