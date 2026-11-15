import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getIpGroups, IP_INDEX_MIN_KUJI, IP_NAMES } from '../../lib/ipGroups'
import IpStats from './IpStats'
import IpPrizeRankings from './IpPrizeRankings'
import { OG_BASE, OG_IMAGE } from '../../lib/siteMeta'
import { jaFullDate, todayJst } from '../../lib/jst'
import KujiRow from '../../components/KujiRow'

// revalidateを1日にしている理由は app/api/cron/revalidate-changed/route.ts を参照。
// データ変化があったページはそのcronが個別に更新する。
export const revalidate = 86400

// パラメータはコード／リポジトリ内ファイル由来で、generateStaticParamsが全件を返す。
// 存在しないURL（botのアクセス等）の404がISRにキャッシュされWritesを生むのを防ぐため、未知のパラメータは即404にする。
export const dynamicParams = false

export async function generateStaticParams() {
  return Object.keys(IP_NAMES).map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const name = IP_NAMES[slug]
  if (!name) return {}
  const groups = await getIpGroups()
  const kujiList = groups[slug] ?? []
  const avgPrice = kujiList.length > 0 ? Math.round(kujiList.reduce((s, k) => s + k.price, 0) / kujiList.length) : null

  // 「ガンダム 一番くじ 予定」「ガンダム 一番くじ 歴代」「ホロライブ 一番くじ 最新」のように探されている（2026-11-15、3か月の検索データ）。
  // 以前は「一番くじ ${name} 一覧｜発売日・価格まとめ」で、作品名が後ろにあり、予定・歴代の語が無かった。
  const title = `${name}の一番くじ 歴代一覧と最新の発売予定`
  const today = todayJst()
  const next = kujiList.find(k => k.release_at != null && k.release_at > today) // kujiList は発売日の古い順
  const latest = [...kujiList].reverse().find(k => k.release_at != null && k.release_at <= today)
  const lead = next?.release_at
    ? `次は${jaFullDate(next.release_at)}発売『${next.title}』。`
    : latest?.release_at
      ? `最新は${jaFullDate(latest.release_at)}発売『${latest.title}』。`
      : ''
  const description = `${name}の一番くじ全${kujiList.length}種を新しい順にまとめています。${lead}${avgPrice ? `1回あたり平均${avgPrice}円。` : ''}各回の賞品・期待値・相場は詳細ページで確認できます。`

  // 取得に失敗して0件のときは noindex にしない（誤って検索から外さないため）。
  const thin = kujiList.length > 0 && kujiList.length < IP_INDEX_MIN_KUJI

  return {
    title,
    description,
    alternates: { canonical: `/ip/${slug}` },
    openGraph: { title, description, url: `https://kujinone.com/ip/${slug}`, ...OG_BASE, images: [OG_IMAGE] },
    ...(thin ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function IpDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const name = IP_NAMES[slug]
  if (!name) notFound()

  const groups = await getIpGroups()
  const kujiList = [...(groups[slug] ?? [])].reverse() // 新しい順

  const today = todayJst()
  const avgPrice = kujiList.length > 0 ? Math.round(kujiList.reduce((s, k) => s + k.price, 0) / kujiList.length) : null
  // 発売日の当日からは発売済み（くじページと同じ判定。発売日の0時台に revalidate-changed が更新する）
  const nextUpcoming = [...kujiList].reverse().find(k => k.release_at != null && k.release_at > today)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: '作品から探す', item: 'https://kujinone.com/ip' },
      { '@type': 'ListItem', position: 3, name, item: `https://kujinone.com/ip/${slug}` },
    ],
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${name}の一番くじ 歴代一覧`,
    numberOfItems: kujiList.length,
    itemListElement: kujiList.map((k, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://kujinone.com/kuji/${k.id}`,
      name: k.title,
    })),
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <div className="bg-stone-800 px-6 py-8 text-white">
        <nav aria-label="パンくずリスト" className="flex items-center gap-1 text-xs text-stone-400 mb-3">
          <Link href="/" className="hover:text-white transition-colors press">ホーム</Link>
          <span className="mx-1">›</span>
          <Link href="/ip" className="hover:text-white transition-colors press">作品から探す</Link>
        </nav>
        <h1 className="text-xl font-black leading-snug">{name}の一番くじ</h1>
        <div className="flex gap-2 mt-2">
          <span className="text-xs bg-white/10 text-stone-300 px-2 py-0.5 rounded-full">全{kujiList.length}種</span>
          {avgPrice && <span className="text-xs bg-white/10 text-stone-300 px-2 py-0.5 rounded-full">平均{avgPrice}円/回</span>}
        </div>
        {nextUpcoming && (
          <p className="text-xs text-shu mt-3">次回は{jaFullDate(nextUpcoming.release_at!)}発売予定</p>
        )}
      </div>

      <IpStats kujiList={kujiList} />

      <div className="px-5 py-6 space-y-3">
        {kujiList.map((kuji, i) => (
          <KujiRow key={kuji.id} kuji={kuji} isReleased={kuji.release_at != null && kuji.release_at <= today} index={i} />
        ))}
      </div>

      <IpPrizeRankings kujiList={kujiList} />
    </main>
  )
}
