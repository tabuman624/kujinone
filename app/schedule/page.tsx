import type { Metadata } from 'next'
import { supabase } from '../lib/supabase'
import ScheduleList from './ScheduleList'

// Vercelは再生成のたびに（内容が同じでも）ISR Writeを計上するため、再生成は1日1回に抑える。
// 日付の切り替わり後の更新は /api/cron/revalidate-changed（毎朝9時台）が行う。
export const revalidate = 86400

// 日本時間の当月（YYYY-MM）。タイトル・一覧の並び順の基準にする。
// revalidate=86400＋毎朝9時台のcronで再生成されるため、月替わり後1日以内に切り替わる。
function currentMonthJst(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 7)
}

function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-')
  return `${y}年${Number(m)}月`
}

// SERPで「スケジュール」系クエリが5位前後なのにCTRが低かったため（SEO監査v2 2-5）、
// 当月を入れて鮮度が伝わるタイトルにし、og:titleがトップページのものを継承していた誤りも直す。
export async function generateMetadata(): Promise<Metadata> {
  const label = monthLabel(currentMonthJst())
  const title = `一番くじ 発売スケジュール【${label}〜】予定表`
  const description = `${label}以降に発売される一番くじの予定表・カレンダー。発売日・1回の価格を毎日更新。気になるくじは賞品ラインナップ・期待値・中古相場までまとめてチェックできます。`
  return {
    title,
    description,
    alternates: { canonical: '/schedule' },
    // layoutのopenGraphはページ側で指定すると丸ごと置き換わるため、全項目を書く
    openGraph: {
      title: `${title} | くじのね`,
      description,
      url: 'https://kujinone.com/schedule',
      siteName: 'くじのね',
      images: [{ url: '/ogp.png', width: 1200, height: 630, alt: 'くじのね' }],
      locale: 'ja_JP',
      type: 'website',
    },
  }
}

export default async function SchedulePage() {
  const { data: kujiList } = await supabase
    .from('kuji')
    .select('id, title, release_at, image_url, price')
    .eq('is_active', true)
    .order('release_at', { ascending: true })
    .order('id', { ascending: true })

  const currentMonth = currentMonthJst()

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: '発売スケジュール', item: 'https://kujinone.com/schedule' },
    ],
  }

  const itemListJsonLd = kujiList && kujiList.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '一番くじ 発売スケジュール',
    url: 'https://kujinone.com/schedule',
    numberOfItems: kujiList.length,
    itemListElement: kujiList.map((k, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://kujinone.com/kuji/${k.id}`,
      name: k.title,
    })),
  } : null

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {itemListJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />}
      <div className="bg-stone-800 px-6 py-8 text-white">
        <p className="text-xs font-bold tracking-widest text-stone-400 mb-1">SCHEDULE</p>
        <h1 className="text-xl font-black">一番くじ 発売スケジュール</h1>
        <p className="text-xs text-stone-400 mt-2">{monthLabel(currentMonth)}以降の発売予定表です。発売日と1回の価格を毎日更新しています。</p>
      </div>
      <ScheduleList kujiList={kujiList ?? []} currentMonth={currentMonth} />
    </main>
  )
}
