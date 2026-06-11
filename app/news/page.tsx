import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: '一番くじ 新作速報 | くじのね',
  description: '一番くじの新作・発売予定情報をいち早くお届け。賞品一覧・期待値・発売日をまとめてチェック。',
}

function fmt(d: string) {
  const dt = new Date(d)
  return `${dt.getMonth() + 1}月${dt.getDate()}日`
}

function fmtMonth(d: string) {
  const dt = new Date(d)
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月`
}

type NewsPost = {
  slug: string
  title: string
  date: string
  releaseDate: string
  summary: string
  imageUrl: string
}

function KujiPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-red-50">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    </div>
  )
}

export default function NewsPage() {
  const dir = path.join(process.cwd(), 'news-posts')

  const allPosts: NewsPost[] = fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(filename => {
      const slug = filename.replace('.md', '')
      const raw = fs.readFileSync(path.join(dir, filename), 'utf-8')
      const { data } = matter(raw)
      return {
        slug,
        title: String(data.title || ''),
        date: String(data.date || ''),
        releaseDate: String(data.release_date || data.date || ''),
        summary: String(data.summary || ''),
        imageUrl: String(data.image_url || ''),
      }
    })

  // 最新3件（記事公開日 desc）
  const latestPosts = [...allPosts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)

  // 全件（発売日 asc）
  const posts = [...allPosts].sort(
    (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
  )

  // 月別グループ
  const grouped = posts.reduce<Record<string, NewsPost[]>>((acc, post) => {
    const key = fmtMonth(post.releaseDate)
    if (!acc[key]) acc[key] = []
    acc[key].push(post)
    return acc
  }, {})

  const today = new Date().toISOString().slice(0, 10)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: '新作速報', item: 'https://kujinone.com/news' },
    ],
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '一番くじ 新作速報',
    url: 'https://kujinone.com/news',
    numberOfItems: posts.length,
    itemListElement: posts.map((post, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://kujinone.com/news/${post.slug}`,
      name: post.title,
    })),
  }

  return (
    <main style={{ background: '#fafafa' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      {/* Header */}
      <div className="px-6 pt-6 pb-6 bg-gray-900">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[11px] font-bold tracking-[0.18em] text-gray-400">NEWS</p>
          <span className="text-[11px] text-gray-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{posts.length} 件</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-1">一番くじ 新作速報</h1>
        <p className="text-xs text-gray-400">発売予定の一番くじをまとめてチェック</p>
      </div>

      {/* LATEST — 横スクロールカード */}
      {latestPosts.length > 0 && (
        <div className="pt-5 pb-2">
          <div className="flex items-baseline justify-between px-5 mb-3">
            <p className="text-[11px] font-bold tracking-[0.18em] text-gray-400">LATEST</p>
            <span className="text-[11px] text-gray-400">最新情報</span>
          </div>
          <div
            className="flex gap-3 px-5 pb-2 overflow-x-auto"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {latestPosts.map((post, i) => (
              <Link
                key={post.slug}
                href={`/news/${post.slug}`}
                className="flex-shrink-0 w-44 bg-white border border-gray-200 rounded-xl overflow-hidden press anim-fade-up group"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* 正方形画像 */}
                <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
                  {post.imageUrl ? (
                    <Image
                      src={post.imageUrl}
                      alt={post.title}
                      fill
                      className="object-cover"
                      sizes="176px"
                      unoptimized
                    />
                  ) : (
                    <KujiPlaceholder />
                  )}
                  {/* 発売バッジ（画像上に重ねる） */}
                  <div className="absolute top-2 left-2">
                    {post.releaseDate >= today
                      ? <span className="text-[9px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded-full shadow">発売予定</span>
                      : <span className="text-[9px] font-bold text-white bg-gray-600 px-1.5 py-0.5 rounded-full shadow">発売済み</span>
                    }
                  </div>
                </div>
                {/* テキスト */}
                <div className="p-2.5">
                  <p className="text-[10px] text-gray-400 mb-1">{fmt(post.releaseDate)}発売</p>
                  <p className="text-[12px] font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-red-600 transition-colors">
                    {post.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 全件リスト（月別） */}
      <div className="px-5 pt-5 pb-8">
        <p className="text-[11px] font-bold tracking-[0.18em] text-gray-400 mb-4">ALL NEWS</p>

        {Object.entries(grouped).map(([month, monthPosts]) => (
          <div key={month} className="mb-8">
            {/* 月ヘッダー */}
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-xs font-black text-gray-400 tracking-wider">{month}</h2>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] text-gray-400">{monthPosts.length}件</span>
            </div>

            <div className="space-y-2">
              {monthPosts.map((post, i) => {
                const isUpcoming = post.releaseDate >= today
                return (
                  <Link
                    key={post.slug}
                    href={`/news/${post.slug}`}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl press anim-fade-up group"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {/* 正方形サムネイル */}
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      {post.imageUrl ? (
                        <Image
                          src={post.imageUrl}
                          alt={post.title}
                          fill
                          className="object-cover"
                          sizes="56px"
                          unoptimized
                        />
                      ) : (
                        <KujiPlaceholder />
                      )}
                    </div>

                    {/* テキスト */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {isUpcoming
                          ? <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">発売予定</span>
                          : <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">発売済み</span>
                        }
                        <span className="text-[10px] text-gray-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(post.releaseDate)}発売
                        </span>
                      </div>
                      <p className="text-[13px] font-bold text-gray-900 leading-snug group-hover:text-red-600 transition-colors line-clamp-2">
                        {post.title}
                      </p>
                    </div>

                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">新作情報はまだありません</p>
          </div>
        )}
      </div>
    </main>
  )
}
