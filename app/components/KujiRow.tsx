import Image from 'next/image'
import Link from 'next/link'
import { jaFullDate, weekdayLabel } from '../lib/jst'

// 作品ページ（/ip/[slug]）と取扱店ページ（/store/[slug]）のくじの行。
// 発売日は年から書く（「作品名 一番くじ 2026」のように年を入れた検索が多いため、2026-11-15）。
// 発売済みかどうかはくじページと同じ判定（発売日の0時から発売済み）で、呼び出し側が決める。
export default function KujiRow({
  kuji,
  isReleased,
  index,
}: {
  kuji: { id: number; title: string; price: number; release_at: string | null; image_url: string | null }
  isReleased: boolean
  index: number
}) {
  const date = kuji.release_at
    ? isReleased
      ? `${jaFullDate(kuji.release_at)}発売`
      : `${jaFullDate(kuji.release_at)}（${weekdayLabel(kuji.release_at)}）発売予定`
    : '発売日未定'
  return (
    <Link
      href={`/kuji/${kuji.id}`}
      className="flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-xl card-hover hover:border-shu hover:shadow-md press anim-fade-up"
      style={{ animationDelay: `${40 + Math.min(index, 10) * 40}ms` }}
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
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isReleased ? 'bg-stone-100 text-stone-500' : 'bg-shu-bg text-shu'}`}>
          {date}
        </span>
        <p className="text-sm font-bold text-stone-800 mt-0.5 truncate">{kuji.title}</p>
        <p className="text-xs text-stone-500">{kuji.price}円/回</p>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}
