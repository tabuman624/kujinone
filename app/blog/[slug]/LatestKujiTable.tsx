import Link from 'next/link'
import { supabase } from '../../lib/supabase'

const WINDOW_DAYS = 30
// 「残り10本」は本文の判断表（残り本数別の目安費用）と揃えた一般的な目安ライン。
// total_countは現状ほぼ全件が80のプレースホルダーのため、そこから割り算した
// 商品別の数値を出すと実測値であるかのように見えてしまう。価格は実データなので、
// そちらを使って商品ごとに本当に変わる値（目安費用）を出す。
const TARGET_REMAINING = 10

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
        現在発売中の商品で、ラストワン賞を残り{TARGET_REMAINING}本のタイミングで狙った場合の目安費用を確認してみましょう。
      </p>
      <div className="space-y-2">
        {targets.map(kuji => {
          const estimatedCost = Math.round((TARGET_REMAINING / 2) * kuji.price)
          return (
            <Link
              key={kuji.id}
              href={`/kuji/${kuji.id}`}
              className="flex items-center justify-between gap-3 p-3 border border-stone-200 rounded-xl press hover:border-shu transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-800 truncate">{kuji.title}</p>
                <p className="text-xs text-stone-500 mt-0.5">残り{TARGET_REMAINING}本なら目安費用 約{estimatedCost.toLocaleString()}円</p>
              </div>
              <span className="text-shu text-sm flex-shrink-0">→</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
