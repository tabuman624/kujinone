import type { Metadata } from 'next'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'
import { notFound } from 'next/navigation'
import ReadingProgress from './ReadingProgress'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const filePath = path.join(process.cwd(), 'posts', `${slug}.md`)
  if (!fs.existsSync(filePath)) notFound()
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data } = matter(raw)
  const description = String(data.summary || '')
  return {
    title: `${data.title} | くじのね`,
    description,
    openGraph: {
      title: `${data.title} | くじのね`,
      description,
      url: `https://kujinone.com/blog/${slug}`,
      images: [{ url: '/logo.png', alt: 'くじのね' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${data.title} | くじのね`,
      description,
      images: ['/logo.png'],
    },
  }
}

function fmt(d: string) {
  const dt = new Date(d)
  return `${dt.getMonth() + 1}月${dt.getDate()}日`
}

function extractFAQ(content: string): { q: string; a: string }[] {
  const lines = content.split('\n')
  const items: { q: string; a: string }[] = []
  let i = 0
  while (i < lines.length) {
    const qMatch = lines[i].match(/^###\s+Q[.．]\s*(.+)/)
    if (qMatch) {
      const question = qMatch[1].trim()
      const answerLines: string[] = []
      i++
      while (i < lines.length && !lines[i].match(/^###/)) {
        const line = lines[i].trim()
        if (line) answerLines.push(line)
        i++
      }
      const answer = answerLines.join(' ').replace(/^A[.．]\s*/, '').replace(/[*_`#]/g, '').trim()
      if (answer) items.push({ q: question, a: answer })
    } else {
      i++
    }
  }
  return items
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const filePath = path.join(process.cwd(), 'posts', `${slug}.md`)
  if (!fs.existsSync(filePath)) notFound()
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  const html = await marked(content)
  const date = fmt(String(data.date))
  const readMins = Math.max(1, Math.round(content.length / 600))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: String(data.title),
    description: String(data.summary || ''),
    datePublished: String(data.date),
    dateModified: String(data.date),
    author: { '@type': 'Organization', name: 'くじのね', url: 'https://kujinone.com' },
    publisher: { '@type': 'Organization', name: 'くじのね', url: 'https://kujinone.com', logo: { '@type': 'ImageObject', url: 'https://kujinone.com/logo.png' } },
    url: `https://kujinone.com/blog/${slug}`,
  }

  // 同カテゴリの関連記事（最大3件、自記事除く）
  const postsDir = path.join(process.cwd(), 'posts')
  const allFiles = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'))
  const relatedPosts = allFiles
    .map(f => {
      const s = f.replace('.md', '')
      const { data: d } = matter(fs.readFileSync(path.join(postsDir, f), 'utf-8'))
      return { slug: s, title: String(d.title), category: String(d.category || ''), date: String(d.date) }
    })
    .filter(p => p.slug !== slug && p.category === String(data.category))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: 'コラム', item: 'https://kujinone.com/blog' },
      { '@type': 'ListItem', position: 3, name: String(data.title), item: `https://kujinone.com/blog/${slug}` },
    ],
  }

  const faqItems = extractFAQ(content)
  const faqJsonLd = faqItems.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  } : null

  return (
    <main style={{ background: '#fff' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <ReadingProgress />

      <div className="px-6 pt-5 pb-7 bg-white border-b border-gray-100">
        <Link href="/blog" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 mb-4 press">
          ← 戻る
        </Link>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold tracking-[0.18em] text-red-600">COLUMN</span>
          <span className="text-gray-300">·</span>
          <span className="text-[11px] text-gray-500 font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{date}</span>
          <span className="text-gray-300">·</span>
          <span className="text-[11px] text-gray-500 font-semibold">約{readMins}分</span>
        </div>
        <h1 className="text-xl font-black leading-snug text-gray-900" style={{ textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{String(data.title)}</h1>
      </div>

      <div className="px-5 py-7">
        <div
          className="kuji-prose--article anim-fade-up"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {relatedPosts.length > 0 && (
        <div className="px-5 pb-6 border-t border-gray-100 pt-6">
          <h2 className="text-xs font-black text-gray-400 tracking-wider mb-3">関連コラム / RELATED</h2>
          <div className="space-y-0">
            {relatedPosts.map((post, i) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="flex items-center gap-3 py-3 border-t border-gray-100 group press"
              >
                <span className="text-[13px] font-black text-gray-200" style={{ minWidth: 24 }}>{String(i + 1).padStart(2, '0')}</span>
                <p className="flex-1 text-[13px] font-bold text-gray-800 leading-snug group-hover:text-red-600 transition-colors">{post.title}</p>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 pb-8 space-y-3 border-t border-gray-100 pt-6">
        <Link href="/schedule" className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 press" style={{ boxShadow: '0 6px 16px rgba(220,38,38,0.35)' }}>
          期待値を計算してみる →
        </Link>
        {String(data.category) !== '基礎' && (
          <Link href="/blog/ichiban-kuji-toha" className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 press">
            一番くじとは？基本を読む →
          </Link>
        )}
        <Link href="/blog" className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 press">
          コラム一覧に戻る
        </Link>
      </div>
    </main>
  )
}

export async function generateStaticParams() {
  const postsDir = path.join(process.cwd(), 'posts')
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'))
  return files.map(f => ({ slug: f.replace('.md', '') }))
}
