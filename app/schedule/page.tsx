import type { Metadata } from 'next'
import { supabase } from '../lib/supabase'
import ScheduleList from './ScheduleList'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '一番くじ 最新発売スケジュール2026 | くじのね',
  description: '2026年の一番くじ最新発売日程を随時更新。ドラゴンボール・ワンピース・鬼滅の刃など人気タイトルの発売日をまとめてチェック。',
}

export default async function SchedulePage() {
  const { data: kujiList } = await supabase
    .from('kuji')
    .select('*')
    .eq('is_active', true)
    .order('release_at', { ascending: true })

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
      <div className="bg-gray-900 px-6 py-8 text-white">
        <p className="text-xs font-bold tracking-widest text-gray-400 mb-1">SCHEDULE</p>
        <h1 className="text-xl font-black">一番くじ 発売スケジュール</h1>
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
          最新の一番くじ発売予定を月別にまとめています。気になるくじをタップすると、賞品一覧と期待値をその場で計算できます。
        </p>
      </div>
      <ScheduleList kujiList={kujiList ?? []} />
    </main>
  )
}
