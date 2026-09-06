import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '今日・今週発売の一番くじ',
  description: '本日発売・今週発売予定の一番くじをまとめてチェック。一番くじの発売日は金曜・土曜に集中しています。',
  alternates: { canonical: '/today' },
}

function fmtRelease(d: string) {
  const parts = d.split('-').slice(1).map(Number)
  return `${parts[0]}月${parts[1]}日`
}

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土']

export default async function TodayPage() {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 6)
  const weekEndStr = weekEnd.toISOString().slice(0, 10)

  const { data: kujiList } = await supabase
    .from('kuji')
    .select('id, title, price, release_at, image_url')
    .eq('is_active', true)
    .gte('release_at', todayStr)
    .lte('release_at', weekEndStr)
    .order('release_at', { ascending: true })

  const todayList = (kujiList ?? []).filter(k => k.release_at === todayStr)
  const weekList = (kujiList ?? []).filter(k => k.release_at !== todayStr)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: '今日・今週発売', item: 'https://kujinone.com/today' },
    ],
  }

  function KujiCard({ kuji, delay, badge }: { kuji: { id: number; title: string; price: number; release_at: string; image_url: string | null }; delay: number; badge: string }) {
    return (
      <Link
        href={`/kuji/${kuji.id}`}
        className="flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-xl card-hover hover:border-shu hover:shadow-md press anim-fade-up"
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="w-12 h-12 bg-shu-bg rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
          {kuji.image_url ? (
            <Image src={kuji.image_url} alt={kuji.title} width={48} height={48} className="w-full h-full object-cover" sizes="48px" unoptimized />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-shu" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs bg-shu-bg text-shu px-2 py-0.5 rounded-full font-semibold">{badge}</span>
          <p className="text-sm font-bold text-stone-800 mt-0.5 truncate">{kuji.title}</p>
          <p className="text-xs text-stone-500">{kuji.price}円/回</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    )
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="bg-stone-800 px-6 py-8 text-white">
        <p className="text-xs font-bold tracking-widest text-stone-400 mb-1">TODAY</p>
        <h1 className="text-xl font-black">今日・今週発売の一番くじ</h1>
        <p className="text-xs text-stone-400 mt-2">
          {todayList.length > 0 ? `本日${todayList.length}本発売` : '本日の発売はありません'} ・ 今週あと{weekList.length}本発売予定
        </p>
      </div>

      {todayList.length > 0 && (
        <div className="px-5 pt-6">
          <h2 className="text-xs font-black text-stone-400 tracking-wider mb-3">本日発売 / TODAY</h2>
          <div className="space-y-3 mb-2">
            {todayList.map((kuji, i) => (
              <KujiCard key={kuji.id} kuji={kuji} delay={40 + i * 40} badge="本日発売" />
            ))}
          </div>
        </div>
      )}

      <div className="px-5 py-6">
        <h2 className="text-xs font-black text-stone-400 tracking-wider mb-3">今週発売 / THIS WEEK</h2>
        {weekList.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-8">今週の残りの発売予定はありません</p>
        ) : (
          <div className="space-y-3">
            {weekList.map((kuji, i) => {
              const d = new Date(kuji.release_at)
              const weekday = WEEKDAY_JA[d.getUTCDay()]
              return (
                <KujiCard key={kuji.id} kuji={kuji} delay={40 + i * 40} badge={`${fmtRelease(kuji.release_at)}(${weekday})発売`} />
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
