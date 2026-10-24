import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { ipSlugFor, IP_NAMES } from '../lib/ipGroups'

const RANK_LIMIT = 5

// /ranking/wanted の RankingTabs.tsx と同じ金銀銅バッジ。
const rankBadgeColors = ['bg-amber-400', 'bg-stone-400', 'bg-orange-700']
function RankBadge({ i }: { i: number }) {
  if (i < 3) {
    return (
      <span
        className={`w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center flex-shrink-0 ${rankBadgeColors[i]}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {i + 1}
      </span>
    )
  }
  return (
    <span className="text-sm font-black text-stone-300 w-6 text-center flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {i + 1}
    </span>
  )
}

export default async function IpCadenceRanking() {
  const { data } = await supabase
    .from('kuji')
    .select('product_id, release_at')
    .eq('is_active', true)
    .not('release_at', 'is', null)

  if (!data) return null
  const today = new Date().toISOString().slice(0, 10)

  // 未発売弾は「実測間隔」に含めない（予測にしないため、過去に実際に発売された
  // 日付どうしの間隔だけを使う）。
  const bySlug = new Map<string, string[]>()
  for (const k of data) {
    const releaseAt = k.release_at as string
    if (releaseAt > today) continue
    const slug = ipSlugFor(k.product_id as string)
    if (!IP_NAMES[slug]) continue
    const arr = bySlug.get(slug) ?? []
    arr.push(releaseAt)
    bySlug.set(slug, arr)
  }

  const results = Array.from(bySlug.entries())
    .map(([slug, dates]) => {
      const sorted = [...dates].sort()
      if (sorted.length < 2) return null
      const intervals: number[] = []
      for (let i = 1; i < sorted.length; i++) {
        intervals.push((new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86_400_000)
      }
      intervals.sort((a, b) => a - b)
      const mid = Math.floor(intervals.length / 2)
      const median = intervals.length % 2 === 0 ? (intervals[mid - 1] + intervals[mid]) / 2 : intervals[mid]
      return { slug, name: IP_NAMES[slug], median: Math.round(median), releaseCount: sorted.length }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.median - b.median)
    .slice(0, RANK_LIMIT)

  if (results.length === 0) return null

  return (
    <div className="px-5 pt-6">
      <h2 className="text-xs font-black text-stone-400 tracking-wider mb-1">発売ペースが速いシリーズ TOP{results.length}</h2>
      <p className="text-xs text-stone-400 mb-3 leading-relaxed">
        過去に実際に発売された弾どうしの間隔（中央値）です。次回の発売時期を予測するものではありません。
      </p>
      <div className="space-y-2">
        {results.map((r, i) => (
          <Link
            key={r.slug}
            href={`/ip/${r.slug}`}
            className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-xl press hover:border-shu hover:shadow-md transition-colors"
          >
            <RankBadge i={i} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-stone-800 truncate">{r.name}</p>
              <p className="text-xs text-stone-400">実測{r.releaseCount}弾の間隔</p>
            </div>
            <span className="text-sm font-black text-shu flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>約{r.median}日</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
