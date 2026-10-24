import { supabase } from '../../lib/supabase'
import { freshValue } from '../../lib/priceFreshness'
import type { IpKuji } from '../../lib/ipGroups'

const TOP_GRADES = ['A賞', 'B賞', 'C賞']

function fmtDate(d: string) {
  const parts = d.split('-').map(Number)
  return `${parts[0]}年${parts[1]}月`
}

export default async function IpStats({ kujiList }: { kujiList: IpKuji[] }) {
  if (kujiList.length === 0) return null
  const today = new Date().toISOString().slice(0, 10)

  const prices = kujiList.map(k => k.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)

  // 発売順で最初と最新弾の価格を比較する。厳密な時系列グラフではなく、
  // 事実として言える範囲のシンプルな比較に留める（断定的な推測は避ける）。
  const releasedSorted = kujiList
    .filter((k): k is IpKuji & { release_at: string } => k.release_at != null)
    .sort((a, b) => a.release_at.localeCompare(b.release_at))
  const earliest = releasedSorted[0]
  const latest = releasedSorted[releasedSorted.length - 1]
  const priceTrend = releasedSorted.length >= 2 && earliest.id !== latest.id
    ? { diff: latest.price - earliest.price }
    : null

  const kujiIds = kujiList.map(k => k.id)
  const { data: prizes } = await supabase
    .from('prizes')
    .select('kuji_id, market_price, market_price_updated_at, auction_price_min, auction_price_updated_at')
    .in('kuji_id', kujiIds)
    .in('grade', TOP_GRADES)

  // 中古相場は発売済みのみ事実として扱う（過去の方針cfb0fbeと同じ考え方）。
  const releasedIds = new Set(kujiList.filter(k => k.release_at != null && k.release_at < today).map(k => k.id))
  const freshTopValues = (prizes ?? [])
    .filter(p => releasedIds.has(p.kuji_id))
    .map(p => freshValue(p))
    .filter((v): v is { value: number; updatedAt: string } => v !== null)

  const avgTopValue = freshTopValues.length > 0
    ? Math.round(freshTopValues.reduce((s, v) => s + v.value, 0) / freshTopValues.length)
    : null

  return (
    <div className="px-5 pt-2 pb-4">
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm text-stone-600 leading-relaxed space-y-2">
        <p>
          このシリーズは{kujiList.length}弾展開され、1回あたりの価格は<strong className="text-stone-800">¥{minPrice.toLocaleString()}〜¥{maxPrice.toLocaleString()}</strong>の範囲です。
        </p>
        {priceTrend && (
          <p>
            {fmtDate(earliest.release_at)}発売の『{earliest.title}』が¥{earliest.price.toLocaleString()}、最新弾『{latest.title}』が¥{latest.price.toLocaleString()}で、
            {priceTrend.diff === 0
              ? '価格に大きな変動はありません。'
              : priceTrend.diff > 0
                ? `¥${priceTrend.diff.toLocaleString()}上がっています。`
                : `¥${Math.abs(priceTrend.diff).toLocaleString()}下がっています。`}
          </p>
        )}
        {avgTopValue != null && (
          <p>
            発売済みの弾における上位賞（A〜C賞）の中古相場は、平均<strong className="text-shu">¥{avgTopValue.toLocaleString()}</strong>です（直近60日以内に取得できたデータ{freshTopValues.length}件の平均）。
          </p>
        )}
      </div>
    </div>
  )
}
