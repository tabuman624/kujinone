import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { monthLabel, todayJst } from '../../lib/jst'
import KujiCard, { type ScheduleKuji } from '../KujiCard'

// 発売済みの一番くじを月別に並べるページ。/schedule は「これから」に集中させるために分けた。
// 発売後のくじページ（相場・ラインナップ）は検索流入の中心なので、全件へのリンクをここに残す。
// 再生成は1日1回（毎朝9時台のcronで更新）。
export const revalidate = 86400

const title = '発売済みの一番くじ一覧（月別）'
const description = 'これまでに発売された一番くじを月別にまとめた一覧です。各くじの賞品ラインナップ・中古相場・期待値をチェックできます。'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/schedule/archive' },
  openGraph: {
    title: `${title} | くじのね`,
    description,
    url: 'https://kujinone.com/schedule/archive',
    siteName: 'くじのね',
    images: [{ url: '/ogp.png', width: 1200, height: 630, alt: 'くじのね' }],
    locale: 'ja_JP',
    type: 'website',
  },
}

export default async function ScheduleArchivePage() {
  const today = todayJst()
  const { data } = await supabase
    .from('kuji')
    .select('id, title, release_at, price, image_url, banner_url')
    .eq('is_active', true)
    .lt('release_at', today)
    .order('release_at', { ascending: false })
    .order('id', { ascending: true })
  const kujiList: ScheduleKuji[] = data ?? []

  const byMonth = new Map<string, ScheduleKuji[]>()
  for (const k of kujiList) {
    const month = k.release_at!.slice(0, 7)
    const list = byMonth.get(month) ?? []
    list.push(k)
    byMonth.set(month, list)
  }
  const months = [...byMonth.keys()] // 新しい月から

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: '発売スケジュール', item: 'https://kujinone.com/schedule' },
      { '@type': 'ListItem', position: 3, name: '発売済みの一番くじ一覧', item: 'https://kujinone.com/schedule/archive' },
    ],
  }

  return (
    <main className="pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="bg-stone-800 px-5 pt-6 pb-5 text-white">
        <nav aria-label="パンくずリスト" className="flex items-center gap-1 text-xs text-stone-400 mb-3">
          <Link href="/" className="hover:text-white transition-colors">ホーム</Link>
          <span className="mx-1">›</span>
          <Link href="/schedule" className="hover:text-white transition-colors">発売スケジュール</Link>
        </nav>
        <p className="text-[10px] font-bold tracking-widest text-stone-400">ARCHIVE</p>
        <h1 className="text-lg font-black mt-0.5">発売済みの一番くじ一覧</h1>
        <p className="text-[11px] text-stone-400 mt-1.5">これまでに発売された一番くじを月別にまとめています。</p>
      </div>

      {months.length > 0 && (
        <nav aria-label="月を選ぶ" className="px-4 pt-4 flex flex-wrap gap-1.5">
          {months.map(m => (
            <a key={m} href={`#m-${m}`} className="text-xs font-bold px-3 py-1.5 rounded-full border border-stone-200 bg-white text-stone-600 hover:border-shu hover:text-shu transition-colors">
              {monthLabel(m)}
            </a>
          ))}
        </nav>
      )}

      {months.map(m => (
        <section key={m} id={`m-${m}`} className="px-4 pt-6" style={{ scrollMarginTop: 16 }}>
          <h2 className="text-sm font-black text-stone-700 mb-3">{monthLabel(m)}に発売された一番くじ</h2>
          <div className="space-y-2">
            {byMonth.get(m)!.map(k => <KujiCard key={k.id} kuji={k} showDate showStores={false} />)}
          </div>
        </section>
      ))}

      <div className="px-4 pt-6">
        <Link
          href="/schedule"
          className="flex items-center justify-between p-4 bg-white border border-stone-200 rounded-xl hover:border-shu transition-colors press"
        >
          <div>
            <p className="text-sm font-bold text-stone-800">これから発売の一番くじ</p>
            <p className="text-xs text-stone-500 mt-0.5">発売スケジュール・カレンダーを見る</p>
          </div>
          <span className="text-shu text-sm">→</span>
        </Link>
      </div>
    </main>
  )
}
