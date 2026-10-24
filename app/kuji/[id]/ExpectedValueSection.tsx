import Link from 'next/link'
import { supabase } from '../../lib/supabase'
// 注: ../../lib は app/lib を指す（ルート直下の lib/ とは別の実体）
import { expectedDraws } from '../../lib/ev'
import Disclaimer from './Disclaimer'
import CollapsibleSection from './CollapsibleSection'

type Prize = {
  grade: string
  name: string
  total: number
  market_price?: number | null
  market_price_updated_at?: string | null
  auction_price_min?: number | null
  auction_price_updated_at?: string | null
}

const ASSUMED_COUNTS = [1, 2, 3]
const TOP_GRADES = ['A賞', 'B賞', 'C賞']
const STALE_DAYS = 60
// ラストワン賞の的中確率テーブル用の残り本数の刻み（総本数に対する割合）
const LAST_ONE_LADDER_FRACTIONS = [1, 0.5, 0.25, 0.125, 0.0625]

function daysSince(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / 86_400_000
}

// 市場価値と取得日をセットで返す。取得から60日以上経過、またはタイムスタンプが
// 無い値（レガシーデータ）は鮮度不明として除外する。古い一点だけの相場を
// 断定的な事実として提示しないため。
function freshValue(p: Prize): { value: number; updatedAt: string } | null {
  if (p.market_price != null && p.market_price_updated_at && daysSince(p.market_price_updated_at) <= STALE_DAYS) {
    return { value: p.market_price, updatedAt: p.market_price_updated_at }
  }
  if (p.auction_price_min != null && p.auction_price_updated_at && daysSince(p.auction_price_updated_at) <= STALE_DAYS) {
    return { value: p.auction_price_min, updatedAt: p.auction_price_updated_at }
  }
  return null
}

export default async function ExpectedValueSection({
  kujiId,
  releaseAt,
  isReleased,
  price,
  totalCount,
  totalCountSource,
  prizes,
}: {
  kujiId: number
  releaseAt: string | null
  isReleased: boolean
  price: number
  totalCount: number | null
  totalCountSource: 'measured' | 'default' | null
  prizes: Prize[]
}) {
  if (!totalCount || totalCount <= 0) return null

  const lotTotal = price * totalCount
  const topPrizes = prizes.filter(p => TOP_GRADES.includes(p.grade))

  // 中古相場は「発売済み」かつ「取得から60日以内」のものだけを事実として扱う。
  // 未発売の商品に流通前の価格を当てても意味がないため（過去の方針 cfb0fbe と同じ考え方）。
  const topPrizesWithValue = isReleased
    ? topPrizes
        .map(p => ({ grade: p.grade, name: p.name, fresh: freshValue(p) }))
        .filter((p): p is { grade: string; name: string; fresh: { value: number; updatedAt: string } } => p.fresh != null)
    : []

  const topValueSum = topPrizesWithValue.reduce((s, p) => s + p.fresh.value, 0)
  const latestUpdatedAt = topPrizesWithValue.length > 0
    ? topPrizesWithValue.map(p => p.fresh.updatedAt).sort().at(-1) ?? null
    : null

  // ラストワン賞は「残り本数のうち1本」という構造が確定しているため、相場データが
  // 無くても的中確率(=1/残り本数)を断定的に計算できる。金額換算の代わりにこちらを使う。
  const lastOne = prizes.find(p => p.grade === 'ラストワン賞')
  const lastOneLadder = lastOne
    ? Array.from(new Set(LAST_ONE_LADDER_FRACTIONS.map(f => Math.max(1, Math.round(totalCount * f))))).sort((a, b) => b - a)
    : []

  // --- 賞構成の分析（金額に依存しない。種数比率と価格ランキングのみ） ---
  const topDesignCount = topPrizes.reduce((s, p) => s + (p.total || 0), 0)
  const totalDesignCount = prizes.reduce((s, p) => s + (p.total || 0), 0)

  let monthRank: { rank: number; total: number } | null = null
  if (releaseAt) {
    const month = releaseAt.slice(0, 7)
    const { data: sameMonth } = await supabase
      .from('kuji')
      .select('id, price')
      .gte('release_at', `${month}-01`)
      .lt('release_at', `${month}-32`)
    if (sameMonth && sameMonth.length > 1) {
      const sorted = [...sameMonth].sort((a, b) => b.price - a.price)
      const idx = sorted.findIndex(k => k.id === kujiId)
      if (idx !== -1) monthRank = { rank: idx + 1, total: sorted.length }
    }
  }

  return (
    <div className="mb-6 anim-fade-up">
      <h2 className="text-xs font-black text-stone-400 tracking-wider mb-3">この一番くじの期待値</h2>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-center">
          <p className="text-[10px] text-stone-400 font-bold mb-1">1回の価格</p>
          <p className="text-base font-black text-stone-800" style={{ fontVariantNumeric: 'tabular-nums' }}>{price.toLocaleString()}円</p>
        </div>
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-center">
          <p className="text-[10px] text-stone-400 font-bold mb-1">総本数</p>
          <p className="text-base font-black text-stone-800" style={{ fontVariantNumeric: 'tabular-nums' }}>{totalCount.toLocaleString()}本</p>
        </div>
        <div className="bg-stone-50 border border-shu-bg rounded-xl p-3 text-center">
          <p className="text-[10px] text-stone-400 font-bold mb-1">ロット総額</p>
          <p className="text-base font-black text-shu" style={{ fontVariantNumeric: 'tabular-nums' }}>{lotTotal.toLocaleString()}円</p>
        </div>
      </div>

      <Link
        href={`/calc?kuji_id=${kujiId}`}
        className="flex items-center justify-center gap-2 w-full py-3.5 bg-shu text-white text-sm font-black rounded-xl hover:bg-shu-dark press mb-4"
        style={{ boxShadow: '0 6px 16px rgba(225, 75, 54, 0.35)' }}
      >
        期待値を計算する →
      </Link>

      {(topPrizes.length > 0 || topPrizesWithValue.length > 0 || lastOneLadder.length > 0 || topDesignCount > 0 || lastOne || monthRank) && (
        <CollapsibleSection label="本数別の平均回数・相場・当選確率を見る">
          {topPrizes.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-stone-500 mb-2">本数別の平均回数</p>
              <div className="space-y-4">
                {topPrizes.map(prize => (
                  <div key={`${prize.grade}-${prize.name}`}>
                    <p className="text-xs font-bold text-stone-700 mb-2">【{prize.grade}】{prize.name}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        <thead>
                          <tr className="text-stone-400 border-b border-stone-200">
                            <th className="text-left font-bold py-1.5 pr-2">本数の仮定</th>
                            <th className="text-right font-bold py-1.5 pr-2">平均</th>
                            <th className="text-right font-bold py-1.5">目安金額</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ASSUMED_COUNTS.map(k => {
                            const avg = expectedDraws(totalCount, k)
                            const cost = Math.round(avg * price)
                            return (
                              <tr key={k} className="border-b border-stone-100 last:border-0">
                                <td className="py-1.5 pr-2 text-stone-600 whitespace-nowrap">{prize.grade}が{k}本の場合</td>
                                <td className="py-1.5 pr-2 text-right font-bold text-stone-800 whitespace-nowrap">平均 {avg.toFixed(1)}回目</td>
                                <td className="py-1.5 text-right text-stone-500 whitespace-nowrap">約{cost.toLocaleString()}円</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topPrizesWithValue.length > 0 && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-stone-500 mb-2">上位賞の中古相場</p>
              <div className="space-y-1.5 mb-2">
                {topPrizesWithValue.map(p => (
                  <div key={p.grade} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-stone-600 truncate">【{p.grade}】{p.name}</span>
                    <span className="text-xs font-bold text-stone-800 whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>¥{p.fresh.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-baseline justify-between pt-2 border-t border-stone-200">
                <span className="text-xs font-bold text-stone-500">上位賞合計</span>
                <span className="text-sm font-black text-shu" style={{ fontVariantNumeric: 'tabular-nums' }}>¥{topValueSum.toLocaleString()}</span>
              </div>
              {latestUpdatedAt && (
                <p className="text-[10px] text-stone-400 mt-2">取得日：{latestUpdatedAt.slice(0, 10)}時点</p>
              )}
            </div>
          )}

          {lastOneLadder.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-stone-500 mb-2">ラストワン賞が当たる確率（残り本数ごと）</p>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                <div className="space-y-1.5">
                  {lastOneLadder.map(n => {
                    const pct = 100 / n
                    return (
                      <div key={n} className="flex items-center justify-between px-1 py-1">
                        <span className="text-[11px] text-stone-600">残り{n}本</span>
                        <span className="text-xs font-bold text-stone-800" style={{ fontVariantNumeric: 'tabular-nums' }}>{pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {(topDesignCount > 0 || lastOne || monthRank) && (
            <div className="mb-4">
              <p className="text-xs font-bold text-stone-500 mb-2">賞の構成</p>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2 text-xs text-stone-600 leading-relaxed">
                {topDesignCount > 0 && totalDesignCount > 0 && (
                  <p>上位賞（{TOP_GRADES.join('・')}）は全{totalDesignCount}種のうち{topDesignCount}種（{Math.round((topDesignCount / totalDesignCount) * 100)}%）を占めます。</p>
                )}
                {lastOne && <p>ラストワン賞が設定されています。最後の1本を引いた人がもらえる特別賞です。</p>}
                {monthRank && (
                  <p>同じ月発売の{monthRank.total}弾の中で、1回あたりの価格は{monthRank.rank}番目に高い商品です。</p>
                )}
              </div>
            </div>
          )}
        </CollapsibleSection>
      )}

      <Disclaimer hasMarketData={topPrizesWithValue.length > 0} totalCountSource={totalCountSource} />
    </div>
  )
}
