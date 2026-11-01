'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

type Kuji = {
  id: string
  title: string
  release_at: string
  image_url: string | null
  price: number
}

// 当年はタブを「11月」と短く、年が違う月は「2027年1月」と年付きで出す
function formatMonthLabel(yyyymm: string, currentYear: string) {
  if (yyyymm === 'unknown') return '未定'
  const [year, month] = yyyymm.split('-')
  return year === currentYear ? `${parseInt(month)}月` : `${year}年${parseInt(month)}月`
}

function headingFor(yyyymm: string, count: number, isPast: boolean) {
  if (yyyymm === 'unknown') return `発売日未定の一番くじ（${count}件）`
  const [year, month] = yyyymm.split('-')
  return `${year}年${parseInt(month)}月${isPast ? 'に発売された' : '発売の'}一番くじ（${count}件）`
}

// currentMonth（日本時間のYYYY-MM）はサーバーで決めて渡す。クライアントで new Date() すると
// 月末・月初にサーバー描画とずれてハイドレーション不一致になるため。
export default function ScheduleList({ kujiList, currentMonth }: { kujiList: Kuji[]; currentMonth: string }) {
  const grouped: Record<string, Kuji[]> = {}
  for (const kuji of kujiList) {
    const key = kuji.release_at?.slice(0, 7) ?? 'unknown'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(kuji)
  }
  const keys = Object.keys(grouped)
  // 当月以降を先頭に昇順、過去の月は後ろに新しい順で並べる（検索から来た人が最初に見るのは今月）
  const upcoming = keys.filter(k => k === 'unknown' || k >= currentMonth).sort((a, b) => (a === 'unknown' ? 1 : b === 'unknown' ? -1 : a.localeCompare(b)))
  const past = keys.filter(k => k !== 'unknown' && k < currentMonth).sort().reverse()
  const months = [...upcoming, ...past]
  const pastSet = new Set(past)
  const currentYear = currentMonth.slice(0, 4)

  const defaultMonth = upcoming[0] ?? past[0] ?? ''
  const [selected, setSelected] = useState(defaultMonth)

  const tab = (month: string) => (
    <button
      key={month}
      onClick={() => setSelected(month)}
      draggable={false}
      className={`flex-shrink-0 px-4 py-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
        selected === month
          ? 'text-shu border-shu'
          : 'text-stone-400 border-transparent hover:text-stone-700'
      }`}
    >
      {formatMonthLabel(month, currentYear)}
    </button>
  )

  return (
    <>
      {/* 月タブ（当月以降 → 過去の月） */}
      <div className="flex flex-wrap items-center border-b border-stone-200 px-4 sticky top-0 bg-white z-10 select-none">
        {upcoming.map(tab)}
        {past.length > 0 && (
          <span className="flex-shrink-0 px-2 py-3 text-[11px] font-bold text-stone-300">過去</span>
        )}
        {past.map(tab)}
      </div>

      {/* くじ一覧（全月ぶんをDOMに出力し、非選択月はCSSで隠す。
          こうすることでクロールされるHTMLに全くじへのリンクが残る） */}
      {months.map(month => (
        <section key={month} className={`px-5 py-5 space-y-3 ${month === selected ? '' : 'hidden'}`}>
          <h2 className="text-sm font-black text-stone-700">{headingFor(month, grouped[month]?.length ?? 0, pastSet.has(month))}</h2>
          {(grouped[month] ?? []).map((kuji, i) => (
            <Link
              key={kuji.id}
              href={`/kuji/${kuji.id}`}
              className="flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-xl card-hover hover:border-shu hover:shadow-md press anim-fade-up"
              style={{ animationDelay: `${40 + i * 40}ms` }}
            >
              <div className="w-12 h-12 bg-shu-bg rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
                {kuji.image_url ? (
                  <Image src={kuji.image_url} alt={kuji.title} width={48} height={48} className="w-full h-full object-cover" sizes="48px" unoptimized />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-shu" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {kuji.release_at && <span className="text-xs bg-shu-bg text-shu px-2 py-0.5 rounded-full font-semibold">{kuji.release_at.split('-').slice(1).map(Number).join('月')}日発売</span>}
                <p className="text-sm font-bold text-stone-800 mt-0.5 truncate">{kuji.title}</p>
                <p className="text-xs text-stone-500">{kuji.price}円/回</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </section>
      ))}
    </>
  )
}
