import { supabase } from '../../lib/supabase'
import { robustTrend, formatPct, type PricePoint, type TrendResult, TREND_MIN_POINTS, TREND_MAX_SPREAD } from '../../lib/priceTrend'

const TOP_GRADES = ['A賞', 'B賞', 'C賞', 'ラストワン賞']
// 2点だけでは「推移」とは言えないため、線を描くのは発売後3日分以上たまった賞のみ。
// 変化率（見出しの数字）はさらに厳しい条件を満たしたときだけ出す（lib/priceTrend.ts）。
const MIN_POINTS = 3

// 軽量インラインSVGのスパークライン。ライブラリ無しで価格推移の形だけを示す。
function Sparkline({ points }: { points: PricePoint[] }) {
  const width = 280
  const height = 40
  const prices = points.map(p => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  const stepX = points.length > 1 ? width / (points.length - 1) : 0
  const coords = points
    .map((p, i) => {
      const x = i * stepX
      const y = height - ((p.price - min) / range) * (height - 4) - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={coords} fill="none" stroke="#E14B36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export type SparklineSeries = { grade: string; name: string; points: PricePoint[]; trend: TrendResult }

// データ取得はページ側でまとめて行い、このコンポーネント自体は同期描画にする。
// 非同期コンポーネントが複数あると、ビルドのたびにHTML内の出力順がSupabaseの応答順で
// 入れ替わり、内容が同じでもISR再生成のたびに「変更あり」としてWritesが発生するため。
export async function loadSparklineSeries(
  prizes: { id: number; grade: string; name: string }[],
  isReleased: boolean,
  releaseAt: string | null,
): Promise<SparklineSeries[]> {
  // 中古相場は発売済みのみ事実として扱う（過去の方針cfb0fbeと同じ考え方）。
  if (!isReleased || !releaseAt) return []

  const topPrizes = prizes.filter(p => TOP_GRADES.includes(p.grade))
  if (topPrizes.length === 0) return []

  // 1日1件・最大4賞×90日分程度なので1000行の上限には届かない。
  const { data: history } = await supabase
    .from('price_history')
    .select('prize_id, price, recorded_at')
    .in('prize_id', topPrizes.map(p => p.id))
    .gte('recorded_at', releaseAt)
    .order('prize_id', { ascending: true })
    .order('recorded_at', { ascending: true })

  if (!history || history.length === 0) return []

  const byPrize = new Map<number, PricePoint[]>()
  for (const h of history) {
    const arr = byPrize.get(h.prize_id) ?? []
    arr.push({ price: h.price, recorded_at: h.recorded_at })
    byPrize.set(h.prize_id, arr)
  }

  // 表示順はA賞・B賞・C賞・ラストワン賞で固定する
  return [...topPrizes]
    .sort((a, b) => TOP_GRADES.indexOf(a.grade) - TOP_GRADES.indexOf(b.grade))
    .map(p => {
      const points = byPrize.get(p.id) ?? []
      if (points.length < MIN_POINTS) return null
      return { grade: p.grade, name: p.name, points, trend: robustTrend(points) }
    })
    .filter((s): s is SparklineSeries => s !== null)
}

export default function PriceSparkline({ series }: { series: SparklineSeries[] }) {
  if (series.length === 0) return null

  return (
    <div>
      <div className="space-y-2">
        {series.map(s => {
          const from = s.points[0].recorded_at
          const to = s.points[s.points.length - 1].recorded_at
          return (
            <div key={s.grade} className="bg-stone-50 border border-stone-200 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-bold text-stone-700 truncate">【{s.grade}】{s.name}</p>
                {s.trend.status === 'ok' && (
                  <span className="text-xs font-bold whitespace-nowrap" style={{ color: s.trend.trend.pct >= 0 ? '#E14B36' : '#57534e', fontVariantNumeric: 'tabular-nums' }}>
                    {formatPct(s.trend.trend.pct)}
                  </span>
                )}
              </div>
              <Sparkline points={s.points} />
              <p className="text-[10px] text-stone-400 mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {from}〜{to}・{s.points.length}日分
                {s.trend.status === 'ok' && `：¥${Math.round(s.trend.trend.startMedian).toLocaleString()} → ¥${Math.round(s.trend.trend.endMedian).toLocaleString()}`}
                {s.trend.status === 'few' && `（変化率は${TREND_MIN_POINTS}日分たまってから表示）`}
                {s.trend.status === 'noisy' && `（最高値と最安値の差が${TREND_MAX_SPREAD}倍以上あり、誤った値が混ざっている可能性があるため変化率は出していません）`}
              </p>
            </div>
          )
        })}
      </div>
      {series.some(s => s.trend.status === 'ok') && (
        <p className="text-[10px] text-stone-400 mt-2 leading-relaxed">
          変化率は、発売日以降の落札相場のうち最初の3日分と直近3日分の中央値を比べたものです。
        </p>
      )}
    </div>
  )
}
