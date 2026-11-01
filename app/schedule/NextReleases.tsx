import Image from 'next/image'
import Link from 'next/link'
import RelDays from './RelDays'
import type { ScheduleKuji } from './KujiCard'
import { shortDate, weekdayLabel } from '../lib/jst'

// 「次に発売」：今日以降で発売日が近い順の数件を大きなバナーで横スクロール表示する。
// 発売前のくじは閲覧数にほとんど差がないため、人気順ではなく発売の近さで選ぶ。
export default function NextReleases({ items, topPrizeByKuji }: { items: ScheduleKuji[]; topPrizeByKuji: Record<number, string> }) {
  if (items.length === 0) return null
  return (
    <div className="pt-4">
      <p className="px-4 mb-2 text-[11px] font-bold tracking-[0.18em] text-stone-500">NEXT · 次に発売</p>
      <div className="flex gap-3 px-4 pb-1 overflow-x-auto snap-x snap-mandatory" style={{ scrollbarWidth: 'none', scrollPaddingLeft: 16 }}>
        {items.map((k, i) => {
          const img = k.banner_url || k.image_url
          const topPrize = topPrizeByKuji[k.id]
          return (
            <Link
              key={k.id}
              href={`/kuji/${k.id}`}
              className="flex-shrink-0 w-[78%] max-w-[320px] snap-start bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-shu transition-colors press"
            >
              <div className="relative bg-shu-bg" style={{ aspectRatio: '3 / 2' }}>
                {img && (
                  <Image
                    src={img}
                    alt={k.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 78vw, 320px"
                    priority={i === 0}
                    loading={i === 0 ? undefined : 'lazy'}
                    unoptimized
                  />
                )}
                {k.release_at && (
                  <>
                    <span className="absolute top-2 left-2 text-[11px] font-black text-white bg-shu px-2 py-0.5 rounded-full">
                      {shortDate(k.release_at)}({weekdayLabel(k.release_at)})
                    </span>
                    <RelDays date={k.release_at} variant="hero" />
                  </>
                )}
              </div>
              <div className="p-3">
                <p className="text-[13px] font-bold text-stone-800 leading-snug line-clamp-2">{k.title}</p>
                <p className="text-[11px] text-stone-500 mt-1 truncate">
                  {k.price.toLocaleString()}円/回{topPrize ? ` ・ A賞：${topPrize}` : ''}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
