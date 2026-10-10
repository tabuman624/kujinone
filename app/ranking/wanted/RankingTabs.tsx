'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const gradeColors: { [key: string]: string } = {
  'A賞': 'bg-amber-100 text-amber-800',
  'B賞': 'bg-blue-100 text-blue-700',
  'C賞': 'bg-emerald-100 text-emerald-700',
  'D賞': 'bg-purple-100 text-purple-700',
  'E賞': 'bg-stone-100 text-stone-700',
}

export type PopularPrizeRankingItem = {
  id: number
  name: string
  grade: string
  kuji_id: number
  image_url: string | null
  auction_price_peak: number | null
  auction_price_updated_at: string | null
  checkCount: number
  kujiTitle: string
}

export type WeeklyRankingItem = {
  id: number
  title: string
  price: number
  image_url: string | null
  banner_url: string | null
  delta: number
}

export type UpcomingRankingItem = {
  id: number
  title: string
  price: number
  image_url: string | null
  banner_url: string | null
  release_at: string | null
  viewCount: number
}

export default function RankingTabs({
  popularPrizeRanking,
  weeklyRanking,
  upcomingRanking,
}: {
  popularPrizeRanking: PopularPrizeRankingItem[]
  weeklyRanking: WeeklyRankingItem[]
  upcomingRanking: UpcomingRankingItem[]
}) {
  const [tab, setTab] = useState<'weekly' | 'popular' | 'upcoming'>('weekly')
  const maxCount = Math.max(1, ...popularPrizeRanking.map(r => r.checkCount))
  const maxDelta = Math.max(1, ...weeklyRanking.map(r => r.delta))
  const maxViewCount = Math.max(1, ...upcomingRanking.map(r => r.viewCount))

  return (
    <div>
      <div className="flex border-b border-stone-200 px-5 sticky top-0 bg-white z-10">
        <button
          type="button"
          onClick={() => setTab('weekly')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${tab === 'weekly' ? 'border-shu text-shu' : 'border-transparent text-stone-400'}`}
        >
          週間急上昇
        </button>
        <button
          type="button"
          onClick={() => setTab('popular')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${tab === 'popular' ? 'border-shu text-shu' : 'border-transparent text-stone-400'}`}
        >
          人気の賞
        </button>
        <button
          type="button"
          onClick={() => setTab('upcoming')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${tab === 'upcoming' ? 'border-shu text-shu' : 'border-transparent text-stone-400'}`}
        >
          発売前注目
        </button>
      </div>

      {tab === 'weekly' && (
        <div className="px-5 py-6 space-y-2">
          {weeklyRanking.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-10">まだ十分なデータがありません</p>
          )}
          {weeklyRanking.map((r, i) => {
            const pct = Math.max(6, Math.round((r.delta / maxDelta) * 100))
            return (
              <Link
                key={r.id}
                href={`/kuji/${r.id}`}
                className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-xl press hover:border-shu hover:shadow-md transition-colors anim-fade-up"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <span className="text-sm font-black text-stone-300 w-6 text-center flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {i + 1}
                </span>
                <div className="w-11 h-11 bg-shu-bg rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                  {(r.banner_url || r.image_url) ? (
                    <Image src={(r.banner_url || r.image_url) as string} alt={r.title} width={44} height={44} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <span className="text-shu text-[9px] font-black">くじ</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-800 truncate">{r.title}</p>
                  <p className="text-[11px] text-stone-400">{r.price}円/回</p>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mt-1.5 mb-1" style={{ maxWidth: 160 }}>
                    <div className="h-full bg-shu rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-stone-500">
                    今週の閲覧数 <span className="font-bold text-shu">+{r.delta.toLocaleString()}</span>
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {tab === 'popular' && (
        <div className="px-5 py-6 space-y-2">
          {popularPrizeRanking.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-10">まだ十分なデータがありません</p>
          )}
          {popularPrizeRanking.map((r, i) => {
            const pct = Math.max(6, Math.round((r.checkCount / maxCount) * 100))
            return (
              <Link
                key={r.id}
                href={`/kuji/${r.kuji_id}`}
                className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-xl press hover:border-shu hover:shadow-md transition-colors anim-fade-up"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <span className="text-sm font-black text-stone-300 w-6 text-center flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {i + 1}
                </span>
                <div className="w-11 h-11 bg-shu-bg rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                  {r.image_url ? (
                    <Image src={r.image_url} alt={r.name} width={44} height={44} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <span className="text-shu text-xs font-black">{r.grade}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${gradeColors[r.grade] || 'bg-stone-100 text-stone-700'}`}>{r.grade}</span>
                    <p className="text-[11px] text-stone-400 truncate">{r.kujiTitle}</p>
                  </div>
                  <p className="text-sm font-bold text-stone-800 truncate">{r.name}</p>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mt-1.5 mb-1" style={{ maxWidth: 160 }}>
                    <div className="h-full bg-shu rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  {r.auction_price_peak != null && (
                    <p className="text-[11px] text-stone-500">
                      ヤフオク最高値 <span className="font-bold text-shu">¥{r.auction_price_peak.toLocaleString()}</span>
                      {r.auction_price_updated_at && (
                        <span className="text-stone-400">（{new Date(r.auction_price_updated_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}時点）</span>
                      )}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {tab === 'upcoming' && (
        <div className="px-5 py-6 space-y-2">
          {upcomingRanking.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-10">まだ十分なデータがありません</p>
          )}
          {upcomingRanking.map((r, i) => {
            const pct = Math.max(6, Math.round((r.viewCount / maxViewCount) * 100))
            return (
              <Link
                key={r.id}
                href={`/kuji/${r.id}`}
                className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-xl press hover:border-shu hover:shadow-md transition-colors anim-fade-up"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <span className="text-sm font-black text-stone-300 w-6 text-center flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {i + 1}
                </span>
                <div className="w-11 h-11 bg-shu-bg rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                  {(r.banner_url || r.image_url) ? (
                    <Image src={(r.banner_url || r.image_url) as string} alt={r.title} width={44} height={44} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <span className="text-shu text-[9px] font-black">くじ</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-800 truncate">{r.title}</p>
                  <p className="text-[11px] text-stone-400">
                    {r.release_at && `${new Date(r.release_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}発売予定`}
                  </p>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mt-1.5 mb-1" style={{ maxWidth: 160 }}>
                    <div className="h-full bg-shu rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-stone-500">
                    閲覧数 <span className="font-bold text-shu">{r.viewCount.toLocaleString()}回</span>
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
