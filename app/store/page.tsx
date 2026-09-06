import type { Metadata } from 'next'
import Link from 'next/link'
import { getStoreGroups, STORE_NAMES } from '../lib/storeGroups'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '取扱店から探す',
  description: 'ローソン・ファミリーマート・セブン‐イレブンなど、取扱店別に一番くじを一覧できます。今どこで買えるかをまとめてチェック。',
  alternates: { canonical: '/store' },
}

export default async function StoreIndexPage() {
  const groups = await getStoreGroups()

  const stores = Object.entries(STORE_NAMES)
    .map(([slug, name]) => ({ slug, name, count: (groups[slug] ?? []).length }))
    .filter(s => s.count > 0)
    .sort((a, b) => b.count - a.count)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: '取扱店から探す', item: 'https://kujinone.com/store' },
    ],
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="bg-stone-800 px-6 py-8 text-white">
        <p className="text-xs font-bold tracking-widest text-stone-400 mb-1">BY STORE</p>
        <h1 className="text-xl font-black">取扱店から探す</h1>
        <p className="text-xs text-stone-400 mt-2">今どこで買えるか、取扱店別に一番くじをまとめてチェック</p>
      </div>

      <div className="px-5 py-6 space-y-2">
        {stores.map(store => (
          <Link
            key={store.slug}
            href={`/store/${store.slug}`}
            className="flex items-center justify-between gap-3 p-4 bg-white border border-stone-200 rounded-xl press hover:border-shu hover:shadow-md transition-colors"
          >
            <div>
              <p className="text-sm font-bold text-stone-800">{store.name}</p>
              <p className="text-xs text-stone-400 mt-0.5">全{store.count}種</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </main>
  )
}
