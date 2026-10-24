import { supabase } from '../../lib/supabase'

const WINDOW_DAYS = 30
const BUCKET_SIZE = 100

export default async function PriceDistribution() {
  const today = new Date().toISOString().slice(0, 10)
  const windowStartDate = new Date()
  windowStartDate.setDate(windowStartDate.getDate() - WINDOW_DAYS)
  const windowStart = windowStartDate.toISOString().slice(0, 10)

  const { data: kujiList } = await supabase
    .from('kuji')
    .select('price')
    .gte('release_at', windowStart)
    .lte('release_at', today)

  if (!kujiList || kujiList.length === 0) return null

  const buckets = new Map<number, number>()
  for (const { price } of kujiList) {
    const bucket = Math.floor(price / BUCKET_SIZE) * BUCKET_SIZE
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1)
  }
  const sorted = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0])
  const maxCount = Math.max(...sorted.map(([, c]) => c))
  const topBucket = sorted.reduce((best, cur) => (cur[1] > best[1] ? cur : best))

  return (
    <div className="px-5 pb-6">
      <h2 className="text-base font-black text-stone-800 mb-3">1回いくら？（直近{WINDOW_DAYS}日・{kujiList.length}商品の実測）</h2>
      <p className="text-sm text-stone-600 mb-3 leading-relaxed">
        直近{WINDOW_DAYS}日間に発売された一番くじ{kujiList.length}商品の価格を集計すると、最も多い価格帯は<strong className="text-shu">¥{topBucket[0].toLocaleString()}〜¥{(topBucket[0] + BUCKET_SIZE - 1).toLocaleString()}</strong>でした。
      </p>
      <div className="space-y-1.5">
        {sorted.map(([bucket, count]) => (
          <div key={bucket} className="flex items-center gap-2">
            <span className="text-xs text-stone-500 w-24 flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
              ¥{bucket.toLocaleString()}〜
            </span>
            <div className="flex-1 h-4 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-shu rounded-full"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-stone-400 w-10 text-right flex-shrink-0">{count}件</span>
          </div>
        ))}
      </div>
    </div>
  )
}
