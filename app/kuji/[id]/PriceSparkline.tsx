import { supabase } from '../../lib/supabase'

const TOP_GRADES = ['A賞', 'B賞', 'C賞']
// 2点だけでは「推移」とは言えないため、最低3点蓄積された賞のみ表示する。
const MIN_POINTS = 3

type PricePoint = { price: number; recorded_at: string }

// 軽量インラインSVGのスパークライン。ライブラリ無しで価格推移の形だけを示す。
function Sparkline({ points }: { points: PricePoint[] }) {
  const width = 280
  const height = 48
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

export default async function PriceSparkline({ kujiId, isReleased }: { kujiId: number; isReleased: boolean }) {
  // 中古相場は発売済みのみ事実として扱う（過去の方針cfb0fbeと同じ考え方）。
  if (!isReleased) return null

  const { data: prizes } = await supabase
    .from('prizes')
    .select('id, grade, name')
    .eq('kuji_id', kujiId)
    .in('grade', TOP_GRADES)

  if (!prizes || prizes.length === 0) return null

  const prizeIds = prizes.map(p => p.id)
  const { data: history } = await supabase
    .from('price_history')
    .select('prize_id, price, recorded_at')
    .in('prize_id', prizeIds)
    .order('recorded_at', { ascending: true })

  if (!history || history.length === 0) return null

  const byPrize = new Map<number, PricePoint[]>()
  for (const h of history) {
    const arr = byPrize.get(h.prize_id) ?? []
    arr.push({ price: h.price, recorded_at: h.recorded_at })
    byPrize.set(h.prize_id, arr)
  }

  const series = prizes
    .map(p => {
      const points = byPrize.get(p.id) ?? []
      if (points.length < MIN_POINTS) return null
      return { grade: p.grade, name: p.name, points }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)

  if (series.length === 0) return null

  return (
    <div className="mb-4">
      <p className="text-xs font-bold text-stone-500 mb-2">発売後の価格推移</p>
      <div className="space-y-3">
        {series.map(s => {
          const first = s.points[0]
          const latest = s.points[s.points.length - 1]
          const changePct = first.price > 0 ? Math.round(((latest.price - first.price) / first.price) * 100) : 0
          return (
            <div key={s.grade} className="bg-stone-50 border border-stone-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-stone-700">【{s.grade}】{s.name}</p>
                <span className="text-xs font-bold" style={{ color: changePct >= 0 ? '#E14B36' : '#57534e' }}>
                  {changePct >= 0 ? `+${changePct}` : changePct}%
                </span>
              </div>
              <Sparkline points={s.points} />
              <div className="flex items-center justify-between text-[10px] text-stone-400 mt-1">
                <span>{first.recorded_at}：¥{first.price.toLocaleString()}</span>
                <span>{latest.recorded_at}：¥{latest.price.toLocaleString()}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
