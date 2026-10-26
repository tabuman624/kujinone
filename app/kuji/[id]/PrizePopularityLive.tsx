'use client'
import { useEffect, useState } from 'react'
import { fetchInterestCounts, fetchViewCounts } from '../../lib/liveCounts'

type Prize = { id: number; name: string; grade: string }

// 枠（見出し・賞名・バーの土台）はサーバーで描画済みの状態から始め、数値だけを後から埋める。
// 読み込み前後で高さが変わらないようにして、下のコンテンツが押し下げられるのを防ぐ。
export default function PrizePopularityLive({
  kujiId,
  prizes,
  showViewCount,
  hasInterest,
}: {
  kujiId: number
  prizes: Prize[]
  showViewCount: boolean
  hasInterest: boolean
}) {
  const [viewCount, setViewCount] = useState<number | null>(null)
  const [interestMap, setInterestMap] = useState<Record<number, number> | null>(null)

  useEffect(() => {
    let cancelled = false
    if (showViewCount) {
      fetchViewCounts([kujiId]).then(map => {
        if (!cancelled && map) setViewCount(map[kujiId] ?? 0)
      })
    }
    if (hasInterest) {
      fetchInterestCounts(prizes.map(p => p.id)).then(map => {
        if (!cancelled && map) setInterestMap(map)
      })
    }
    return () => { cancelled = true }
  }, [kujiId, prizes, showViewCount, hasInterest])

  const maxCount = interestMap ? Math.max(0, ...Object.values(interestMap)) : 0

  return (
    <div className="mb-6 anim-fade-up">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xs font-black text-stone-400 tracking-wider">注目度 / POPULARITY</h2>
        {showViewCount && (
          <span className="text-xs text-stone-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
            閲覧数：{viewCount != null ? viewCount.toLocaleString() : '—'}回
          </span>
        )}
      </div>
      {hasInterest && (
        <div className="bg-stone-50 rounded-xl p-4 space-y-3">
          {prizes.map(prize => {
            const count = interestMap?.[prize.id] ?? 0
            const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
            return (
              <div key={prize.id}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-black text-stone-400 w-6 flex-shrink-0">{prize.grade}</span>
                  <span className="text-[11px] font-semibold text-stone-700 flex-1 truncate">{prize.name}</span>
                </div>
                <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-shu rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
