import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'みんなが狙っている賞ランキング',
  description: '一番くじの期待値計算ツールで実際にチェックされた回数をもとにした、狙われている賞のランキング。ヤフオク相場もあわせてチェックできます。',
  alternates: { canonical: '/ranking/wanted' },
}

const gradeColors: { [key: string]: string } = {
  'A賞': 'bg-amber-100 text-amber-800',
  'B賞': 'bg-blue-100 text-blue-700',
  'C賞': 'bg-emerald-100 text-emerald-700',
  'D賞': 'bg-purple-100 text-purple-700',
  'E賞': 'bg-stone-100 text-stone-700',
}

export default async function WantedRankingPage() {
  const { data: interests } = await supabase
    .from('prize_interest')
    .select('prize_id, check_count')
    .gt('check_count', 0)
    .order('check_count', { ascending: false })
    .limit(50)

  const prizeIds = (interests ?? []).map(i => i.prize_id)
  const { data: prizes } = prizeIds.length > 0
    ? await supabase.from('prizes').select('id, name, grade, kuji_id, image_url, auction_price_peak, auction_price_updated_at').in('id', prizeIds)
    : { data: [] as Array<{ id: number; name: string; grade: string; kuji_id: number; image_url: string | null; auction_price_peak: number | null; auction_price_updated_at: string | null }> }

  const kujiIds = [...new Set((prizes ?? []).map(p => p.kuji_id))]
  const { data: kujiList } = kujiIds.length > 0
    ? await supabase.from('kuji').select('id, title').in('id', kujiIds)
    : { data: [] as Array<{ id: number; title: string }> }

  const prizeMap = Object.fromEntries((prizes ?? []).map(p => [p.id, p]))
  const kujiMap = Object.fromEntries((kujiList ?? []).map(k => [k.id, k.title as string]))

  const ranking = (interests ?? [])
    .map(i => {
      const prize = prizeMap[i.prize_id]
      if (!prize) return null
      return { ...prize, checkCount: i.check_count as number, kujiTitle: kujiMap[prize.kuji_id] ?? '' }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .slice(0, 30)

  const maxCount = Math.max(1, ...ranking.map(r => r.checkCount))

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: 'みんなが狙っている賞ランキング', item: 'https://kujinone.com/ranking/wanted' },
    ],
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="bg-stone-800 px-6 py-8 text-white">
        <p className="text-xs font-bold tracking-widest text-stone-400 mb-1">WANTED RANKING</p>
        <h1 className="text-xl font-black">みんなが狙っている賞</h1>
        <p className="text-xs text-stone-400 mt-2">期待値計算ツールで実際にチェックされた回数をもとにしたランキング</p>
      </div>

      <div className="px-5 py-6 space-y-2">
        {ranking.length === 0 && (
          <p className="text-sm text-stone-400 text-center py-10">まだ十分なデータがありません</p>
        )}
        {ranking.map((r, i) => {
          const pct = Math.max(6, Math.round((r.checkCount / maxCount) * 100))
          return (
            <Link
              key={r.id}
              href={`/kuji/${r.kuji_id}`}
              className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-xl press hover:border-shu hover:shadow-md transition-colors anim-fade-up"
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <span className="text-sm font-black text-stone-300 w-6 text-center flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {i + 1}
              </span>
              <div className="w-11 h-11 bg-shu-bg rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                {r.image_url ? (
                  <Image src={r.image_url} alt={r.name} width={44} height={44} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <span className="text-shu text-xs font-black">{r.grade}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${gradeColors[r.grade] || 'bg-stone-100 text-stone-700'}`}>{r.grade}</span>
                  <p className="text-[11px] text-stone-400 truncate">{r.kujiTitle}</p>
                </div>
                <p className="text-sm font-bold text-stone-800 truncate">{r.name}</p>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mt-1.5 mb-1" style={{ maxWidth: 160 }}>
                  <div className="h-full bg-shu rounded-full" style={{ width: `${pct}%` }} />
                </div>
                {r.auction_price_peak != null && (
                  <p className="text-[11px] text-stone-500">
                    ヤフオク最高値 <span className="font-bold text-shu">¥{r.auction_price_peak.toLocaleString()}</span>
                    {r.auction_price_updated_at && (
                      <span className="text-stone-400">（{new Date(r.auction_price_updated_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}時点）</span>
                    )}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
