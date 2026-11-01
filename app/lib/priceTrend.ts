// 発売後の落札相場（price_history）の変化を、外れ値に引きずられにくい形で出す。
//
// 以前は「最初の1点 → 最新の1点」の生の変化率を見出しにしていたため、1日だけの誤取得
// （セット品・別商品の混入など）がそのまま −89% のような数字になっていた（トイ・ストーリー C賞）。
// ここでは次のルールで、記録が十分にあり、値動きが極端でないときだけ変化率を出す。
//
// - 発売日以降の記録だけを使う（発売前の予約・転売価格は「発売後の変化」ではないため）。
// - 最初の3日分の中央値と、直近3日分の中央値を比べる。両者が重ならないよう最低6日分を必要とする。
// - 期間内の最大値÷最小値が3倍以上なら、誤取得が混ざっている可能性が高いので変化率は出さない
//   （実データ62系列のうち該当は2件。トイ・ストーリー C賞 9.4倍、ムーミン A賞 3.0倍）。
//   相場が3倍以上動くこと自体はあり得るが、機械的に本物の値動きと区別できないため、断定しない方を選ぶ。

export const TREND_EDGE_POINTS = 3
export const TREND_MIN_POINTS = TREND_EDGE_POINTS * 2
export const TREND_MAX_SPREAD = 3

export type PricePoint = { price: number; recorded_at: string }

export type RobustTrend = {
  pct: number // 整数に丸めた変化率
  startMedian: number
  endMedian: number
  days: number // 使った記録の日数（price_historyは1日1件）
  from: string // 'YYYY-MM-DD'
  to: string
}

export type TrendResult =
  | { status: 'ok'; trend: RobustTrend }
  | { status: 'few' } // 6日分に満たない
  | { status: 'noisy' } // 値動きが大きすぎる

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** points は発売日以降・日付昇順のもの */
export function robustTrend(points: PricePoint[]): TrendResult {
  if (points.length < TREND_MIN_POINTS) return { status: 'few' }
  const prices = points.map(p => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min <= 0 || max / min >= TREND_MAX_SPREAD) return { status: 'noisy' }
  const startMedian = median(prices.slice(0, TREND_EDGE_POINTS))
  const endMedian = median(prices.slice(-TREND_EDGE_POINTS))
  return {
    status: 'ok',
    trend: {
      pct: Math.round(((endMedian - startMedian) / startMedian) * 100),
      startMedian,
      endMedian,
      days: points.length,
      from: points[0].recorded_at,
      to: points[points.length - 1].recorded_at,
    },
  }
}

export function formatPct(pct: number): string {
  if (pct === 0) return '±0%'
  return pct > 0 ? `+${pct}%` : `−${Math.abs(pct)}%`
}
