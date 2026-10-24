import Link from 'next/link'
import { supabase } from '../../lib/supabase'

const WINDOW_DAYS = 30
const THRESHOLD_DIVISOR = 8 // 総本数の1/8を「狙い目」の目安ラインとする（経験則、断定ではない）

export default async function LatestKujiTable() {
  const today = new Date().toISOString().slice(0, 10)
  const windowStartDate = new Date()
  windowStartDate.setDate(windowStartDate.getDate() - WINDOW_DAYS)
  const windowStart = windowStartDate.toISOString().slice(0, 10)

  const { data: kujiList } = await supabase
    .from('kuji')
    .select('id, title, price, total_count')
    .gte('release_at', windowStart)
    .lte('release_at', today)
    .order('release_at', { ascending: false })

  if (!kujiList || kujiList.length === 0) return null

  const ids = kujiList.map(k => k.id)
  const { data: lastOnePrizes } = await supabase
    .from('prizes')
    .select('kuji_id')
    .in('kuji_id', ids)
    .eq('grade', 'ラストワン賞')
  const lastOneIds = new Set((lastOnePrizes ?? []).map(p => p.kuji_id))

  const targets = kujiList.filter(k => lastOneIds.has(k.id) && k.total_count > 0).slice(0, 3)
  if (targets.length === 0) return null

  return (
    <div className="px-5 pb-6">
      <h2 className="text-base font-black text-stone-800 mb-3">実際の商品で計算する</h2>
      <p className="text-sm text-stone-600 mb-3 leading-relaxed">
        現在発売中の商品で、ラストワン賞の狙い目ラインを確認してみましょう。
      </p>
      <div className="space-y-2">
        {targets.map(kuji => {
          const threshold = Math.max(1, Math.round(kuji.total_count / THRESHOLD_DIVISOR))
          return (
            <Link
              key={kuji.id}
              href={`/kuji/${kuji.id}`}
              className="flex items-center justify-between gap-3 p-3 border border-stone-200 rounded-xl press hover:border-shu transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-800 truncate">{kuji.title}</p>
                <p className="text-xs text-stone-500 mt-0.5">残り{threshold}本以下から狙い目（目安）</p>
              </div>
              <span className="text-shu text-sm flex-shrink-0">→</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
