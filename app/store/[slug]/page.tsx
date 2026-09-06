import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getStoreGroups, STORE_NAMES } from '../../lib/storeGroups'

export const revalidate = 3600

export async function generateStaticParams() {
  return Object.keys(STORE_NAMES).map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const name = STORE_NAMES[slug]
  if (!name) return {}
  const groups = await getStoreGroups()
  const kujiList = groups[slug] ?? []

  const title = `${name}の一番くじ一覧`
  const description = `${name}で取り扱いのある一番くじ全${kujiList.length}種をまとめてチェック。発売日・価格・賞品一覧は各くじの詳細ページで確認できます。`

  return {
    title,
    description,
    alternates: { canonical: `/store/${slug}` },
    openGraph: { title, description, url: `https://kujinone.com/store/${slug}` },
  }
}

function fmtRelease(d: string | null) {
  if (!d) return '発売日未定'
  const parts = d.split('-').slice(1).map(Number)
  return `${parts[0]}月${parts[1]}日`
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
  const kujiList = [...(groups[slug] ?? [])].reverse() // 新しい順
  const today = new Date().toISOString().slice(0, 10)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: '取扱店から探す', item: 'https://kujinone.com/store' },
      { '@type': 'ListItem', position: 3, name, item: `https://kujinone.com/store/${slug}` },
    ],
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${name}の一番くじ一覧`,
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
          <Link href="/store" className="hover:text-white transition-colors press">取扱店から探す</Link>
        </nav>
        <h1 className="text-xl font-black leading-snug">{name}の一番くじ</h1>
        <span className="inline-block text-xs bg-white/10 text-stone-300 px-2 py-0.5 rounded-full mt-2">全{kujiList.length}種</span>
      </div>

      <div className="px-5 py-6 space-y-3">
        {kujiList.map((kuji, i) => {
          const isReleased = kuji.release_at != null && kuji.release_at < today
          return (
            <Link
              key={kuji.id}
              href={`/kuji/${kuji.id}`}
              className="flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-xl card-hover hover:border-shu hover:shadow-md press anim-fade-up"
              style={{ animationDelay: `${40 + i * 40}ms` }}
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
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isReleased ? 'bg-stone-100 text-stone-500' : 'bg-shu-bg text-shu'}`}>
                  {kuji.release_at ? `${fmtRelease(kuji.release_at)}${isReleased ? '発売済み' : '発売予定'}` : '発売日未定'}
                </span>
                <p className="text-sm font-bold text-stone-800 mt-0.5 truncate">{kuji.title}</p>
                <p className="text-xs text-stone-500">{kuji.price}円/回</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
