import { supabase } from '../../lib/supabase'
import { calculateEv, expectedDraws, type Prize as EvPrize } from '../../lib/ev'
// 注: ../../lib は app/lib を指す（ルート直下の lib/ とは別の実体）
import Disclaimer from './Disclaimer'

type Prize = {
  grade: string
  name: string
  total: number
  market_price?: number | null
  auction_price_min?: number | null
  auction_price_max?: number | null
}

const ASSUMED_COUNTS = [1, 2, 3]
const TOP_GRADES = ['A賞', 'B賞', 'C賞']
const LADDER_FRACTIONS = [1, 0.75, 0.5, 0.25, 0.125]

function prizeValue(p: Prize): number | null {
  return p.market_price ?? p.auction_price_min ?? p.auction_price_max ?? null
}

// 損得の大きさに応じた4パターンのコメント（価格に対する比率で分類）
function verdictComment(netPerDraw: number, price: number): string {
  const ratio = price > 0 ? netPerDraw / price : 0
  if (ratio > 0.3) return '上位賞の相場が強く、現時点では引く側に分がある計算です。'
  if (ratio > 0) return 'わずかにプラスですが、相場の変動で簡単に逆転する差です。'
  if (ratio > -0.3) return '現状はわずかにマイナスで、見送りも選択肢に入る水準です。'
  return '相場に対して価格が高く、現状は見送りが無難な計算です。'
}

export default async function ExpectedValueSection({
  kujiId,
  releaseAt,
  price,
  totalCount,
  totalCountSource,
  prizes,
}: {
  kujiId: number
  releaseAt: string | null
  price: number
  totalCount: number | null
  totalCountSource: 'measured' | 'default' | null
  prizes: Prize[]
}) {
  if (!totalCount || totalCount <= 0) return null

  const lotTotal = price * totalCount
  const topPrizes = prizes.filter(p => TOP_GRADES.includes(p.grade))

  // 相場データのある上位賞（価値が価格を超えるもののみ「上位賞」として扱う）
  const topValuedPrizes = topPrizes
    .map(p => ({ grade: p.grade, value: prizeValue(p) }))
    .filter((p): p is { grade: string; value: number } => p.value != null && p.value > price)

  const lowerValues = prizes
    .filter(p => !TOP_GRADES.includes(p.grade))
    .map(prizeValue)
    .filter((v): v is number => v != null)
  const lowerAvgValue = lowerValues.length > 0
    ? lowerValues.reduce((s, v) => s + v, 0) / lowerValues.length
    : null

  const hasMarketData = topValuedPrizes.length > 0 || lowerValues.length > 0

  // --- EvSummary: ロット全体を前提にした期待値サマリー ---
  let evSummary: { netPerDraw: number; expectedValuePerDraw: number } | null = null
  if (hasMarketData) {
    const scenarioPrizes: EvPrize[] = [
      ...topValuedPrizes.map(p => ({ rank: p.grade, name: p.grade, remaining: 1, value: p.value })),
      { rank: 'lower', name: '下位賞', remaining: totalCount - topValuedPrizes.length, value: lowerAvgValue },
    ]
    const result = calculateEv({ pricePerDraw: price, totalRemaining: totalCount, prizes: scenarioPrizes })
    if (result.netPerDraw != null && result.expectedValuePerDraw != null) {
      evSummary = { netPerDraw: result.netPerDraw, expectedValuePerDraw: result.expectedValuePerDraw }
    }
  }

  // --- RemainingTable: 残り本数ごとの判断表（あくまで仮定のシナリオ） ---
  const ladderSet = new Set<number>()
  for (const f of LADDER_FRACTIONS) {
    const n = Math.round(totalCount * f)
    if (n > topValuedPrizes.length) ladderSet.add(n)
  }
  const ladder = Array.from(ladderSet).sort((a, b) => b - a)

  const scenarioColumns = topValuedPrizes.length > 0
    ? [
        { label: `${topValuedPrizes[0].grade}が残っている場合`, included: [topValuedPrizes[0]] },
        ...(topValuedPrizes.length > 1
          ? [{ label: `${topValuedPrizes[0].grade}・${topValuedPrizes[1].grade}賞が残っている場合`, included: [topValuedPrizes[0], topValuedPrizes[1]] }]
          : []),
        { label: '下位賞のみ', included: [] as { grade: string; value: number }[] },
      ]
    : []

  function cellNet(n: number, included: { grade: string; value: number }[]): number | null {
    const scenarioPrizes: EvPrize[] = [
      ...included.map(p => ({ rank: p.grade, name: p.grade, remaining: 1, value: p.value })),
      { rank: 'lower', name: '下位賞', remaining: n - included.length, value: lowerAvgValue },
    ]
    return calculateEv({ pricePerDraw: price, totalRemaining: n, prizes: scenarioPrizes }).netPerDraw
  }

  const showRemainingTable = ladder.length >= 2 && scenarioColumns.length > 0 && lowerAvgValue != null

  // --- PrizeAnalysis: 賞構成の分析 ---
  const topDesignCount = topPrizes.reduce((s, p) => s + (p.total || 0), 0)
  const totalDesignCount = prizes.reduce((s, p) => s + (p.total || 0), 0)
  const lastOne = prizes.find(p => p.grade === 'ラストワン賞')

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

      {evSummary && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-4">
          <div className="flex items-baseline justify-between mb-1">
            <p className="text-xs font-bold text-stone-500">1回あたりの損得（相場ベース）</p>
            <p
              className="text-lg font-black"
              style={{ color: evSummary.netPerDraw > 0 ? '#E14B36' : '#78716c', fontVariantNumeric: 'tabular-nums' }}
            >
              {evSummary.netPerDraw > 0 ? '＋' : ''}{Math.round(evSummary.netPerDraw).toLocaleString()}円
            </p>
          </div>
          <p className="text-xs text-stone-500 leading-relaxed">{verdictComment(evSummary.netPerDraw, price)}</p>
        </div>
      )}

      {topPrizes.length > 0 && (
        <details className="mb-3 group">
          <summary className="text-xs font-bold text-stone-500 py-1 cursor-pointer select-none flex items-center gap-1">
            本数別の平均回数を見る
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-stone-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="space-y-4 mt-3">
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
        </details>
      )}

      {showRemainingTable && (
        <div className="mb-4">
          <p className="text-xs font-bold text-stone-500 mb-2">残り何本から狙い目か（仮定シナリオ）</p>
          <div className="space-y-2">
            {ladder.map(n => (
              <div key={n} className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                <p className="text-xs font-bold text-stone-700 mb-2">残り{n}本と仮定した場合</p>
                <div className="space-y-1.5">
                  {scenarioColumns.map(col => {
                    const net = cellNet(n, col.included)
                    if (net == null) return null
                    const isPlus = net > 0
                    return (
                      <div
                        key={col.label}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-lg ${isPlus ? 'bg-shu-bg' : ''}`}
                      >
                        <span className="text-[11px] text-stone-600">{col.label}</span>
                        <span
                          className="text-xs font-bold whitespace-nowrap"
                          style={{ color: isPlus ? '#E14B36' : '#78716c', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {isPlus ? '＋' : ''}{Math.round(net).toLocaleString()}円
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
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

      <Disclaimer hasMarketData={hasMarketData} totalCountSource={totalCountSource} />
    </div>
  )
}
