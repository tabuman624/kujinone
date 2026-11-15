import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getStoreGroups, INDEXED_STORE_SLUGS, STORE_NAMES, storeLabel, type StoreKuji } from '../../lib/storeGroups'
import { OG_BASE, OG_IMAGE } from '../../lib/siteMeta'
import { jaFullDate, todayJst } from '../../lib/jst'
import KujiRow from '../../components/KujiRow'

// revalidateを1日にしている理由は app/api/cron/revalidate-changed/route.ts を参照。
// 発売予定と発売済みの切り替えがあるので、そのcronが毎日0時台に全店のページを更新する。
export const revalidate = 86400

// パラメータはコード／リポジトリ内ファイル由来で、generateStaticParamsが全件を返す。
// 存在しないURL（botのアクセス等）の404がISRにキャッシュされWritesを生むのを防ぐため、未知のパラメータは即404にする。
export const dynamicParams = false

export async function generateStaticParams() {
  return Object.keys(STORE_NAMES).map(slug => ({ slug }))
}

// 「ローソン 一番くじ 予定」「イトーヨーカドー 一番くじ」のように、店名と予定で探されている（2026-11-15、3か月の検索データ）。
// そのため発売予定を先に出し、発売済みは新しい順に続ける。発売日の当日からは発売済み（くじページと同じ判定）。
function splitByRelease(list: StoreKuji[], today: string) {
  const upcoming = list.filter(k => !k.release_at || k.release_at > today) // 発売日の近い順（発売日未定は最後）
  const released = list.filter(k => k.release_at && k.release_at <= today).reverse() // 新しい順
  return { upcoming, released }
}

function pageTitle(slug: string): string {
  return slug === 'online' ? '一番くじONLINEの発売予定と最新の一覧' : `${storeLabel(slug)}の一番くじ｜発売予定と最新の一覧`
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  if (!STORE_NAMES[slug]) return {}
  const groups = await getStoreGroups()
  const kujiList = groups[slug] ?? []
  const { upcoming, released } = splitByRelease(kujiList, todayJst())

  const label = storeLabel(slug)
  const title = pageTitle(slug)
  const next = upcoming.find(k => k.release_at)
  const latest = released[0]
  const lead = next?.release_at
    ? `次は${jaFullDate(next.release_at)}発売『${next.title}』。`
    : latest?.release_at
      ? `最新は${jaFullDate(latest.release_at)}発売『${latest.title}』。`
      : ''
  const description = `${label}で買える一番くじの発売予定と、これまでの全${kujiList.length}種の一覧。${lead}各くじの賞品・相場は詳細ページで確認できます。`

  // 取得に失敗して0件のときも、検索に出すかどうかは変えない（店ごとに決めている）
  const indexed = INDEXED_STORE_SLUGS.includes(slug)

  return {
    title,
    description,
    alternates: { canonical: `/store/${slug}` },
    openGraph: { title, description, url: `https://kujinone.com/store/${slug}`, ...OG_BASE, images: [OG_IMAGE] },
    // 書店・ホビーショップ・公式ショップは、ほぼ全部のくじを扱い /schedule と変わらないので検索に出さない（storeGroups.ts）
    ...(indexed ? {} : { robots: { index: false, follow: true } }),
  }
}

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const name = STORE_NAMES[slug]
  if (!name) notFound()

  const groups = await getStoreGroups()
  const kujiList = groups[slug] ?? []
  const { upcoming, released } = splitByRelease(kujiList, todayJst())
  const label = storeLabel(slug)
  const heading = slug === 'online' ? '一番くじONLINE' : `${label}の一番くじ`

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: '取扱店から探す', item: 'https://kujinone.com/store' },
      { '@type': 'ListItem', position: 3, name: label, item: `https://kujinone.com/store/${slug}` },
    ],
  }

  const ordered = [...upcoming, ...released]
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: pageTitle(slug),
    numberOfItems: ordered.length,
    itemListElement: ordered.map((k, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://kujinone.com/kuji/${k.id}`,
      name: k.title,
    })),
  }

  const sectionHeading = 'text-xs font-black text-stone-400 tracking-wider mb-3'

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <div className="bg-stone-800 px-6 py-8 text-white">
        <nav aria-label="パンくずリスト" className="flex items-center gap-1 text-xs text-stone-400 mb-3">
          <Link href="/" className="hover:text-white transition-colors press">ホーム</Link>
          <span className="mx-1">›</span>
          <Link href="/store" className="hover:text-white transition-colors press">取扱店から探す</Link>
        </nav>
        <h1 className="text-xl font-black leading-snug">{heading}</h1>
        <div className="flex gap-2 mt-2">
          <span className="text-xs bg-white/10 text-stone-300 px-2 py-0.5 rounded-full">発売予定{upcoming.length}種</span>
          <span className="text-xs bg-white/10 text-stone-300 px-2 py-0.5 rounded-full">全{kujiList.length}種</span>
        </div>
      </div>

      {slug === 'online' && (
        <p className="px-5 pt-6 -mb-2 text-xs text-stone-500 leading-relaxed">
          一番くじONLINEで引く手順と注意点：
          <Link href="/blog/ichiban-kuji-online" className="text-shu font-bold hover:underline">一番くじオンラインのラストワン賞の狙い方と売り切れ対策</Link>
        </p>
      )}

      <section className="px-5 pt-6">
        <h2 className={sectionHeading}>発売予定 / UPCOMING</h2>
        {upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map((kuji, i) => <KujiRow key={kuji.id} kuji={kuji} isReleased={false} index={i} />)}
          </div>
        ) : (
          <p className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-600">いま発表されている発売予定はありません。</p>
        )}
      </section>

      {released.length > 0 && (
        <section className="px-5 pt-8">
          <h2 className={sectionHeading}>発売済み / RELEASED</h2>
          <div className="space-y-3">
            {released.map((kuji, i) => <KujiRow key={kuji.id} kuji={kuji} isReleased index={upcoming.length + i} />)}
          </div>
        </section>
      )}

      <p className="px-5 pt-6 pb-8 text-[11px] text-stone-400 leading-relaxed">
        {/* 公式の商品ページの注意書き（「店舗の事情によりお取扱いが中止になる場合や発売時期が異なる場合がございます」）に合わせる */}
        取扱店は公式サイトの発表をもとにしています。店舗の事情で、取り扱いが中止になったり、発売時期が違ったりすることがあります。
      </p>
    </main>
  )
}
