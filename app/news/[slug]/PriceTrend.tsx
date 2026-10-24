import { supabase } from '../../lib/supabase'

const TOP_GRADES = ['A賞', 'B賞', 'C賞']
// 2点だけでは「推移」とは言えないため、最低3点蓄積された賞のみ表示する。
const MIN_POINTS = 3

export default async function PriceTrend({ kujiId }: { kujiId: number }) {
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

  const byPrize = new Map<number, { price: number; recorded_at: string }[]>()
  for (const h of history) {
    const arr = byPrize.get(h.prize_id) ?? []
    arr.push({ price: h.price, recorded_at: h.recorded_at })
    byPrize.set(h.prize_id, arr)
  }

  const trends = prizes
    .map(p => {
      const points = byPrize.get(p.id) ?? []
      if (points.length < MIN_POINTS) return null
      const first = points[0]
      const latest = points[points.length - 1]
      const changePct = first.price > 0 ? Math.round(((latest.price - first.price) / first.price) * 100) : 0
      return { grade: p.grade, name: p.name, first, latest, changePct, count: points.length }
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)

  if (trends.length === 0) return null

  return (
    <div className="px-5 pb-6">
      <h2 className="text-base font-black text-stone-800 mb-3">発売後の価格推移</h2>
      <p className="text-sm text-stone-600 mb-3 leading-relaxed">
        上位賞の中古相場を発売後から継続的に記録しています。現時点の記録は以下の通りです。
      </p>
      <div className="space-y-2">
        {trends.map(t => (
          <div key={t.grade} className="border border-stone-200 rounded-xl p-3">
            <p className="text-xs font-bold text-stone-700 mb-2">【{t.grade}】{t.name}</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500">{t.first.recorded_at}時点</span>
              <span className="font-bold text-stone-800" style={{ fontVariantNumeric: 'tabular-nums' }}>¥{t.first.price.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-stone-500">{t.latest.recorded_at}時点</span>
              <span className="font-bold text-shu" style={{ fontVariantNumeric: 'tabular-nums' }}>¥{t.latest.price.toLocaleString()}</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1.5">
              発売直後比 {t.changePct >= 0 ? `+${t.changePct}` : t.changePct}%（{t.count}件のデータ）
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
