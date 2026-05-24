import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '新作速報 | くじのね',
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
}

export default function NewsPage() {
  const dir = path.join(process.cwd(), 'news-posts')

  const posts: NewsPost[] = fs
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
      }
    })
    .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime())

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

      <div className="px-6 pt-6 pb-6 bg-gray-900">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[11px] font-bold tracking-[0.18em] text-gray-400">NEWS</p>
          <span className="text-[11px] text-gray-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{posts.length} 件</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-1">新作速報</h1>
        <p className="text-xs text-gray-400">発売予定の一番くじをまとめてチェック</p>
      </div>

      <div className="px-5 pt-5 pb-8">
        {Object.entries(grouped).map(([month, monthPosts]) => (
          <div key={month} className="mb-8">
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
                    className="flex items-start gap-3 p-3.5 bg-white border border-gray-200 rounded-xl press anim-fade-up group"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex-shrink-0 text-center pt-0.5">
                      <p className="text-[10px] font-bold text-gray-400 leading-none mb-0.5">{fmt(post.releaseDate).replace('日', '')}</p>
                      <p className="text-[10px] font-black text-gray-900">日</p>
                    </div>
                    <div className="w-px self-stretch bg-gray-100 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {isUpcoming
                          ? <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">発売予定</span>
                          : <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">発売済み</span>
                        }
                      </div>
                      <p className="text-[13px] font-bold text-gray-900 leading-snug group-hover:text-red-600 transition-colors line-clamp-2">{post.title}</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-1 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
