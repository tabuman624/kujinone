import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import BlogTabs from './BlogTabs'

export const metadata: Metadata = {
  title: 'コラム一覧 | くじのね',
  description: '一番くじの期待値・確率・攻略法をわかりやすく解説するコラム集。初心者から上級者まで役立つ情報をお届けします。',
}

export default function BlogPage() {
  const postsDir = path.join(process.cwd(), 'posts')
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'))

  const posts = files
    .map(filename => {
      const slug = filename.replace('.md', '')
      const raw = fs.readFileSync(path.join(postsDir, filename), 'utf-8')
      const { data } = matter(raw)
      return {
        slug,
        title: String(data.title || ''),
        date: String(data.date || ''),
        summary: String(data.summary || ''),
        category: String(data.category || ''),
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const featuredIdx = posts.findIndex(p => p.slug === 'kitaichi-toha')
  const featured = featuredIdx >= 0 ? posts[featuredIdx] : posts[0]
  const rest = posts.filter(p => p.slug !== featured.slug)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: 'コラム', item: 'https://kujinone.com/blog' },
    ],
  }

  return (
    <main style={{ background: '#fafafa' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="px-6 pt-6 pb-6 bg-gray-900">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[11px] font-bold tracking-[0.18em] text-gray-400">COLUMN</p>
          <span className="text-[11px] text-gray-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{posts.length} ARTICLES</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-1">コラム</h1>
        <p className="text-xs text-gray-400">一番くじをもっと賢く楽しむためのガイド</p>
      </div>

      <BlogTabs featured={featured} posts={rest} />
    </main>
  )
}
