import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { ipSlugFor, IP_NAMES } from '../../lib/ipGroups'

// データ取得はページ側でまとめて行い、このコンポーネント自体は同期描画にする。
// 非同期コンポーネントが複数あると、HTML内の出力順がSupabaseの応答順で毎回入れ替わり、
// 内容が同じでもISR再生成のたびに「変更あり」としてVercel ISR Writesが発生するため
// （app/kuji/[id]/PriceSparkline.tsx と同じ対応）。
export type SameIpData = {
  ipName: string
  others: Array<{ id: number; title: string; price: number; release_at: string | null; total_count: number | null }>
}

export async function loadSameIpComparison(kujiId: number): Promise<SameIpData | null> {
  const { data: self } = await supabase.from('kuji').select('product_id').eq('id', kujiId).single()
  const productId = self?.product_id as string | undefined
  if (!productId) return null

  const slug = ipSlugFor(productId)
  const ipName = IP_NAMES[slug]
  // 31件の既知IPに無い作品は表示名が無いため、ページ化しない（/ip/[slug]と同じ運用）。
  if (!ipName) return null

  const { data: all } = await supabase
    .from('kuji')
    .select('id, title, price, release_at, total_count, product_id')
    .eq('is_active', true)
    .order('id', { ascending: true })

  const others = (all ?? [])
    .filter(k => k.id !== kujiId && ipSlugFor(k.product_id as string) === slug)
    .sort((a, b) => (b.release_at ?? '').localeCompare(a.release_at ?? ''))
    .slice(0, 5)
    .map(k => ({ id: k.id, title: k.title, price: k.price, release_at: k.release_at, total_count: k.total_count }))

  return { ipName, others }
}

export default function SameIpComparison({ data }: { data: SameIpData | null }) {
  if (!data) return null
  const { ipName, others } = data

  if (others.length === 0) return null

  return (
    <div className="px-5 pb-6">
      <h2 className="text-base font-black text-stone-800 mb-3">{ipName}の過去弾と比較</h2>
      <p className="text-sm text-stone-600 mb-3 leading-relaxed">
        同作品の一番くじシリーズを価格・発売日で比較できます。
      </p>
      <div className="space-y-2">
        {others.map(k => (
          <Link
            key={k.id}
            href={`/kuji/${k.id}`}
            className="flex items-center justify-between gap-3 p-3 border border-stone-200 rounded-xl press hover:border-shu transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-stone-800 truncate">{k.title}</p>
              <p className="text-xs text-stone-500 mt-0.5">
                {k.release_at ? `${k.release_at.slice(0, 7).replace('-', '年')}月発売` : '発売日未定'}
                ・{k.price.toLocaleString()}円/回
                {k.total_count ? `・全${k.total_count}本` : ''}
              </p>
            </div>
            <span className="text-shu text-sm flex-shrink-0">→</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
