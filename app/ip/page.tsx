import type { Metadata } from 'next'
import Link from 'next/link'
import { getIpGroups, IP_NAMES } from '../lib/ipGroups'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '作品から探す',
  description: '一番くじを作品(IP)別にまとめて一覧できます。ワンピース・ドラゴンボール・呪術廻戦など、シリーズごとの発売日・価格をまとめてチェック。',
  alternates: { canonical: '/ip' },
}

export default async function IpIndexPage() {
  const groups = await getIpGroups()

  const ips = Object.entries(groups)
    .map(([slug, kujiList]) => ({ slug, name: IP_NAMES[slug], count: kujiList.length }))
    .sort((a, b) => b.count - a.count)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: '作品から探す', item: 'https://kujinone.com/ip' },
    ],
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="bg-stone-800 px-6 py-8 text-white">
        <p className="text-xs font-bold tracking-widest text-stone-400 mb-1">BY WORK</p>
        <h1 className="text-xl font-black">作品から探す</h1>
        <p className="text-xs text-stone-400 mt-2">シリーズごとに一番くじの発売日・価格をまとめてチェック</p>
      </div>

      <div className="px-5 py-6 space-y-2">
        {ips.map(ip => (
          <Link
            key={ip.slug}
            href={`/ip/${ip.slug}`}
            className="flex items-center justify-between gap-3 p-4 bg-white border border-stone-200 rounded-xl press hover:border-shu hover:shadow-md transition-colors"
          >
            <div>
              <p className="text-sm font-bold text-stone-800">{ip.name}</p>
              <p className="text-xs text-stone-400 mt-0.5">全{ip.count}種</p>
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
