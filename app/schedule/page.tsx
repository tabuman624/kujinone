import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { currentMonthJst, monthLabel, shortDate, todayJst, weekdayOf, weekdayLabel } from '../lib/jst'
import KujiCard, { type ScheduleKuji } from './KujiCard'
import MonthCalendar from './MonthCalendar'
import NextReleases from './NextReleases'
import RelDays from './RelDays'
import ScheduleControls from './ScheduleControls'
import { storeFilterKeys } from './stores'

// Vercelは再生成のたびに（内容が同じでも）ISR Writeを計上するため、再生成は1日1回に抑える。
// 日付の切り替わり後の更新は /api/cron/revalidate-changed（毎日12時台）が行う。
// サーバーで描画する値はJSTの日付だけで決まる（＝1日1回しか変わらない）。
// 「あと◯日」「今日」の印は閲覧者の時計で決まるのでブラウザ側（RelDays / ScheduleControls）で出す。
export const revalidate = 86400

const NEXT_COUNT = 5

// SERPで「スケジュール」系クエリが5位前後なのにCTRが低かったため（SEO監査v2 2-5）、
// 当月を入れて鮮度が伝わるタイトルにし、og:titleがトップページのものを継承していた誤りも直す。
export async function generateMetadata(): Promise<Metadata> {
  const label = monthLabel(currentMonthJst())
  const title = `一番くじ 発売スケジュール【${label}〜】予定表`
  const description = `${label}以降に発売される一番くじの予定表・カレンダー。発売日・1回の価格・取扱店を毎日更新。気になるくじは賞品ラインナップ・期待値・中古相場までまとめてチェックできます。`
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
  const today = todayJst()
  const currentMonth = currentMonthJst()

  // 今日以降に発売されるくじだけを載せる。発売済みは /schedule/archive に分けた。
  const { data } = await supabase
    .from('kuji')
    .select('id, title, release_at, price, image_url, banner_url, available_stores')
    .eq('is_active', true)
    .or(`release_at.gte.${today},release_at.is.null`)
    .order('release_at', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })
  const kujiList: ScheduleKuji[] = data ?? []

  const dated = kujiList.filter(k => k.release_at)
  const undated = kujiList.filter(k => !k.release_at)
  const nextItems = dated.slice(0, NEXT_COUNT)

  // 「次に発売」に添えるA賞名（無ければ省略）
  const topPrizeByKuji: Record<number, string> = {}
  if (nextItems.length > 0) {
    const { data: prizes } = await supabase
      .from('prizes')
      .select('kuji_id, name, sort_order')
      .in('kuji_id', nextItems.map(k => k.id))
      .eq('grade', 'A賞')
      .order('sort_order', { ascending: true })
    for (const p of prizes ?? []) {
      if (!(p.kuji_id in topPrizeByKuji)) topPrizeByKuji[p.kuji_id] = p.name
    }
  }

  // 月 → 日付 → くじ
  const byMonth = new Map<string, Map<string, ScheduleKuji[]>>()
  for (const k of dated) {
    const month = k.release_at!.slice(0, 7)
    const days = byMonth.get(month) ?? new Map<string, ScheduleKuji[]>()
    const list = days.get(k.release_at!) ?? []
    list.push(k)
    days.set(k.release_at!, list)
    byMonth.set(month, days)
  }
  const months = [...byMonth.keys()].sort()
  const currentYear = currentMonth.slice(0, 4)
  const tabs = [
    ...months.map(m => ({
      key: m,
      label: m.startsWith(currentYear) ? `${Number(m.slice(5))}月` : monthLabel(m),
    })),
    ...(undated.length > 0 ? [{ key: 'unknown', label: '未定' }] : []),
  ]

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: '発売スケジュール', item: 'https://kujinone.com/schedule' },
    ],
  }

  const itemListJsonLd = kujiList.length > 0 ? {
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
    <main className="pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {itemListJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />}

      <div className="bg-stone-800 px-5 pt-6 pb-5 text-white">
        <p className="text-[10px] font-bold tracking-widest text-stone-400">SCHEDULE</p>
        <h1 className="text-lg font-black mt-0.5">一番くじ 発売スケジュール</h1>
        <p className="text-[11px] text-stone-400 mt-1.5">{monthLabel(currentMonth)}以降の発売予定表です。発売日・価格・取扱店を毎朝更新しています。</p>
      </div>

      <NextReleases items={nextItems} topPrizeByKuji={topPrizeByKuji} />

      <div className="mt-4">
        {tabs.length > 0 && <ScheduleControls months={tabs} defaultMonth={tabs[0].key} />}
      </div>

      {months.map(month => {
        const days = byMonth.get(month)!
        const dates = [...days.keys()].sort()
        const countByDate: Record<string, number> = {}
        const storesByDate: Record<string, string> = {}
        for (const d of dates) {
          const list = days.get(d)!
          countByDate[d] = list.length
          storesByDate[d] = [...new Set(list.flatMap(k => storeFilterKeys(k.available_stores ?? [])))].join(' ')
        }
        return (
          <section key={month} data-msec={month} className="px-4 pt-4 pb-2">
            <h2 className="text-sm font-black text-stone-700 mb-3">{monthLabel(month)}発売の一番くじ</h2>
            <MonthCalendar month={month} countByDate={countByDate} storesByDate={storesByDate} />
            {dates.map(d => {
              const wd = weekdayOf(d)
              return (
                <div key={d} id={`d-${d}`} className="dgroup" style={{ scrollMarginTop: 56 }}>
                  <div className="sticky top-[45px] z-[5] bg-stone-50/95 backdrop-blur py-1.5 flex items-center gap-2">
                    <h3 className="text-[15px] font-black text-stone-800">
                      <time dateTime={d}>
                        {shortDate(d)}
                        <span className={`text-xs ml-0.5 ${wd === 0 ? 'text-rose-500' : wd === 6 ? 'text-sky-600' : 'text-stone-500'}`}>({weekdayLabel(d)})</span>
                      </time>
                    </h3>
                    <RelDays date={d} variant="header" />
                  </div>
                  <div className="space-y-2 pb-3">
                    {days.get(d)!.map(k => <KujiCard key={k.id} kuji={k} />)}
                  </div>
                </div>
              )
            })}
            <p className="nomatch hidden text-xs text-stone-400 text-center py-6">この月は、選択中のお店での発売予定がありません。</p>
          </section>
        )
      })}

      {undated.length > 0 && (
        <section data-msec="unknown" className="px-4 pt-4 pb-2">
          <h2 className="text-sm font-black text-stone-700 mb-3">発売日未定の一番くじ</h2>
          <div className="dgroup space-y-2 pb-3">
            {undated.map(k => <KujiCard key={k.id} kuji={k} />)}
          </div>
          <p className="nomatch hidden text-xs text-stone-400 text-center py-6">選択中のお店での発売予定がありません。</p>
        </section>
      )}

      {kujiList.length === 0 && (
        <p className="px-5 py-10 text-sm text-stone-500 text-center">現在、発売予定の一番くじは登録されていません。</p>
      )}

      <div className="px-4 pt-4">
        <Link
          href="/schedule/archive"
          className="flex items-center justify-between p-4 bg-white border border-stone-200 rounded-xl hover:border-shu transition-colors press"
        >
          <div>
            <p className="text-sm font-bold text-stone-800">発売済みの一番くじ一覧</p>
            <p className="text-xs text-stone-500 mt-0.5">これまでに発売されたくじを月別に見る</p>
          </div>
          <span className="text-shu text-sm">→</span>
        </Link>
      </div>
    </main>
  )
}
