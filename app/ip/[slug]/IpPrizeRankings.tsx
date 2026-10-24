import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { freshValue } from '../../lib/priceFreshness'
import type { IpKuji } from '../../lib/ipGroups'

const RANK_LIMIT = 3

// /ranking/wanted の RankingTabs.tsx と同じ金銀銅バッジ。1〜3位だけ丸バッジにし、
// 4位以降は無いが揃えておく（RANK_LIMIT=3なので実質常にこちら）。
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

// シリーズ丸ごとの集計（弾単位）は弾数が少ないシリーズだと穴が目立つが、
// 賞単位（1弾あたり数〜十数件）ならどのシリーズでもランキングに足るデータがある。
export default async function IpPrizeRankings({ kujiList }: { kujiList: IpKuji[] }) {
  if (kujiList.length === 0) return null
  const today = new Date().toISOString().slice(0, 10)
  const kujiMap = new Map(kujiList.map(k => [k.id, k]))
  const kujiIds = kujiList.map(k => k.id)

  const { data: prizes } = await supabase
    .from('prizes')
    .select('id, kuji_id, grade, name, image_url, market_price, market_price_updated_at, auction_price_min, auction_price_updated_at')
    .in('kuji_id', kujiIds)

  if (!prizes || prizes.length === 0) return null

  // 相場ランキング: 発売済み・60日以内取得のみ事実として扱う（既存方針と同じ）。
  const releasedIds = new Set(kujiList.filter(k => k.release_at != null && k.release_at < today).map(k => k.id))
  const priceRanking = prizes
    .filter(p => releasedIds.has(p.kuji_id))
    .map(p => {
      const fresh = freshValue(p)
      return fresh ? { ...p, value: fresh.value } : null
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => b.value - a.value)
    .slice(0, RANK_LIMIT)

  const prizeIds = prizes.map(p => p.id)
  const { data: interests } = await supabase
    .from('prize_interest')
    .select('prize_id, check_count')
    .in('prize_id', prizeIds)
    .gt('check_count', 0)

  const interestMap = new Map((interests ?? []).map(i => [i.prize_id, i.check_count as number]))
  const interestRanking = prizes
    .map(p => ({ ...p, count: interestMap.get(p.id) ?? 0 }))
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, RANK_LIMIT)

  if (priceRanking.length === 0 && interestRanking.length === 0) return null

  return (
    <div className="px-5 pb-8 space-y-6 border-t border-stone-100 pt-6">
      {interestRanking.length > 0 && (
        <div>
          <h2 className="text-xs font-black text-stone-400 tracking-wider mb-3">シリーズ内 注目の賞品 TOP{interestRanking.length}</h2>
          <div className="space-y-2">
            {interestRanking.map((p, i) => (
              <Link
                key={p.id}
                href={`/kuji/${p.kuji_id}`}
                className="flex items-center gap-3 p-3 border border-stone-200 rounded-xl press hover:border-shu transition-colors"
              >
                <RankBadge i={i} />
                <div className="w-11 h-11 bg-shu-bg rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                  {p.image_url ? (
                    <Image src={p.image_url} alt={p.name} width={44} height={44} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <span className="text-shu text-xs font-black">{p.grade}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-800 truncate">【{p.grade}】{p.name}</p>
                  <p className="text-xs text-stone-400 truncate">{kujiMap.get(p.kuji_id)?.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {priceRanking.length > 0 && (
        <div>
          <h2 className="text-xs font-black text-stone-400 tracking-wider mb-3">シリーズ内 中古相場 TOP{priceRanking.length}</h2>
          <div className="space-y-2">
            {priceRanking.map((p, i) => (
              <Link
                key={p.id}
                href={`/kuji/${p.kuji_id}`}
                className="flex items-center gap-3 p-3 border border-stone-200 rounded-xl press hover:border-shu transition-colors"
              >
                <RankBadge i={i} />
                <div className="w-11 h-11 bg-shu-bg rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                  {p.image_url ? (
                    <Image src={p.image_url} alt={p.name} width={44} height={44} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <span className="text-shu text-xs font-black">{p.grade}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-800 truncate">【{p.grade}】{p.name}</p>
                  <p className="text-xs text-stone-400 truncate">{kujiMap.get(p.kuji_id)?.title}</p>
                </div>
                <span className="text-sm font-black text-shu flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>¥{p.value.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
