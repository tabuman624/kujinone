import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: '一番くじ 新作速報',
  description: '一番くじの新作・発売予定情報をいち早くお届け。賞品一覧・期待値・発売日をまとめてチェック。',
  alternates: { canonical: '/news' },
}

function toDateStr(d: unknown): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  return String(d || '').slice(0, 10)
}

function fmt(d: string) {
  const dt = new Date(d)
  return `${dt.getUTCMonth() + 1}月${dt.getUTCDate()}日`
}

function fmtMonth(d: string) {
  const dt = new Date(d)
  return `${dt.getUTCFullYear()}年${dt.getUTCMonth() + 1}月`
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
    <div className="w-full h-full flex items-center justify-center bg-shu-bg">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-shu" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    </div>
  )
}

export const revalidate = 86400

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
        date: toDateStr(data.date),
        releaseDate: toDateStr(data.release_date || data.date),
        summary: String(data.summary || ''),
        imageUrl: String(data.image_url || ''),
      }
    })

  const today = new Date().toISOString().slice(0, 10)

  const upcomingPosts = allPosts.filter(p => p.releaseDate >= today)
  const pastPosts = allPosts.filter(p => p.releaseDate < today)

  // 最新3件（記事公開日 desc、発売予定のみ）
  const latestPosts = [...upcomingPosts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)

  // 発売予定（発売日が近い順）
  const posts = [...upcomingPosts].sort((a, b) =>
    new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
  )

  // 発売済みアーカイブ（発売日が新しい順）。以前はここが一覧・ItemListから
  // まるごと除外されており、発売直後から検索経由の内部リンクを失っていた。
  const archivePosts = [...pastPosts].sort((a, b) =>
    new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
  )

  // 月別グループ
  const grouped = posts.reduce<Record<string, NewsPost[]>>((acc, post) => {
    const key = fmtMonth(post.releaseDate)
    if (!acc[key]) acc[key] = []
    acc[key].push(post)
    return acc
  }, {})

  const archiveGrouped = archivePosts.reduce<Record<string, NewsPost[]>>((acc, post) => {
    const key = fmtMonth(post.releaseDate)
    if (!acc[key]) acc[key] = []
    acc[key].push(post)
    return acc
  }, {})

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: '新作速報', item: 'https://kujinone.com/news' },
    ],
  }

  // ページに実際に表示している全件（発売予定→アーカイブの順）をItemListに反映する
  const listedPosts = [...posts, ...archivePosts]

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '一番くじ 新作速報',
    url: 'https://kujinone.com/news',
    numberOfItems: listedPosts.length,
    itemListElement: listedPosts.map((post, i) => ({
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
      <div className="px-6 pt-6 pb-6 bg-stone-800">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[11px] font-bold tracking-[0.18em] text-stone-400">NEWS</p>
          <span className="text-[11px] text-stone-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{posts.length} 件</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-1">一番くじ 新作速報</h1>
        <p className="text-xs text-stone-400">発売予定の一番くじをまとめてチェック</p>
      </div>

      {/* LATEST — 横スクロールカード */}
      {latestPosts.length > 0 && (
        <div className="pt-5 pb-2">
          <div className="flex items-baseline justify-between px-5 mb-3">
            <p className="text-[11px] font-bold tracking-[0.18em] text-stone-400">LATEST</p>
            <span className="text-[11px] text-stone-400">最新情報</span>
          </div>
          <div
            className="flex gap-3 px-5 pb-2 overflow-x-auto"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {latestPosts.map((post, i) => (
              <Link
                key={post.slug}
                href={`/news/${post.slug}`}
                className="flex-shrink-0 w-44 bg-white border border-stone-200 rounded-xl overflow-hidden press anim-fade-up group"
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
                    <span className="text-[9px] font-bold text-white bg-shu px-1.5 py-0.5 rounded-full shadow">発売予定</span>
                  </div>
                </div>
                {/* テキスト */}
                <div className="p-2.5">
                  <p className="text-[10px] text-stone-400 mb-1">{fmt(post.releaseDate)}発売</p>
                  <p className="text-[12px] font-bold text-stone-800 leading-snug line-clamp-2 group-hover:text-shu transition-colors">
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
        <p className="text-[11px] font-bold tracking-[0.18em] text-stone-400 mb-4">ALL NEWS</p>

        {Object.entries(grouped).map(([month, monthPosts]) => (
          <div key={month} className="mb-8">
            {/* 月ヘッダー */}
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-xs font-black text-stone-400 tracking-wider">{month}</h2>
              <div className="flex-1 h-px bg-stone-200" />
              <span className="text-[11px] text-stone-400">{monthPosts.length}件</span>
            </div>

            <div className="space-y-2">
              {monthPosts.map((post, i) => (
                <Link
                  key={post.slug}
                  href={`/news/${post.slug}`}
                  className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-xl press anim-fade-up group"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {/* 正方形サムネイル */}
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100">
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
                      <span className="text-[9px] font-bold text-shu bg-shu-bg px-1.5 py-0.5 rounded-full">発売予定</span>
                      <span className="text-[10px] text-stone-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(post.releaseDate)}発売
                      </span>
                    </div>
                    <p className="text-[13px] font-bold text-stone-800 leading-snug group-hover:text-shu transition-colors line-clamp-2">
                      {post.title}
                    </p>
                  </div>

                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-stone-300 flex-shrink-0 group-hover:text-shu transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <p className="text-sm">新作情報はまだありません</p>
          </div>
        )}
      </div>

      {/* 発売済みアーカイブ */}
      {archivePosts.length > 0 && (
        <div className="px-5 pt-2 pb-8 border-t-8 border-stone-100">
          <p className="text-[11px] font-bold tracking-[0.18em] text-stone-400 mb-4 mt-6">ARCHIVE · 発売済み</p>

          {Object.entries(archiveGrouped).map(([month, monthPosts]) => (
            <div key={month} className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xs font-black text-stone-400 tracking-wider">{month}</h2>
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-[11px] text-stone-400">{monthPosts.length}件</span>
              </div>

              <div className="space-y-2">
                {monthPosts.map((post, i) => (
                  <Link
                    key={post.slug}
                    href={`/news/${post.slug}`}
                    className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-xl press anim-fade-up group"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100">
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

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-full">発売済み</span>
                        <span className="text-[10px] text-stone-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(post.releaseDate)}発売
                        </span>
                      </div>
                      <p className="text-[13px] font-bold text-stone-800 leading-snug group-hover:text-shu transition-colors line-clamp-2">
                        {post.title}
                      </p>
                    </div>

                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-stone-300 flex-shrink-0 group-hover:text-shu transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
