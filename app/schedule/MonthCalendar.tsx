import { weekdayOf } from '../lib/jst'

// 月のミニカレンダー（日曜始まり）。発売日は色付き＋●（本数分）で、タップするとその日の見出しへ飛ぶ。
// 「今日」の枠線はブラウザ側（ScheduleControls）で付けるので、ここはサーバーで固定の内容になる。
export default function MonthCalendar({
  month,
  storesByDate,
  countByDate,
}: {
  month: string // YYYY-MM
  storesByDate: Record<string, string> // 日付 → その日に発売されるくじの店舗フィルタキー（スペース区切り）
  countByDate: Record<string, number>
}) {
  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const firstWeekday = weekdayOf(`${month}-01`)
  const days = Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)

  return (
    <div className="grid grid-cols-7 gap-y-1 text-center bg-white border border-stone-200 rounded-xl p-2.5 mb-4" aria-label={`${y}年${m}月の発売カレンダー`}>
      {['日', '月', '火', '水', '木', '金', '土'].map((w, i) => (
        <div key={w} className={`text-[10px] font-bold ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-sky-600' : 'text-stone-400'}`}>{w}</div>
      ))}
      {Array.from({ length: firstWeekday }, (_, i) => <span key={`pad-${i}`} />)}
      {days.map(d => {
        const day = Number(d.slice(8))
        const count = countByDate[d] ?? 0
        if (!count) {
          return (
            <span key={d} className="calday text-xs text-stone-300 py-[3px] rounded-lg flex flex-col items-center leading-tight" data-date={d}>
              {day}
            </span>
          )
        }
        return (
          <a
            key={d}
            href={`#d-${d}`}
            className="calday text-xs text-stone-800 font-extrabold bg-shu-bg py-[3px] rounded-lg flex flex-col items-center leading-tight"
            data-date={d}
            data-stores={storesByDate[d] ?? ''}
          >
            {day}
            <i className="not-italic text-[6px] text-shu tracking-[1px]">{'●'.repeat(Math.min(count, 3))}</i>
          </a>
        )
      })}
    </div>
  )
}
