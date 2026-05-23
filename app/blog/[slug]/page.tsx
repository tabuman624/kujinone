import type { Metadata } from 'next'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'
import ReadingProgress from './ReadingProgress'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const filePath = path.join(process.cwd(), 'posts', `${slug}.md`)
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data } = matter(raw)
  return {
    title: `${data.title} | くじのね`,
    description: String(data.summary || ''),
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

      <div className="px-5 pb-8 space-y-3 border-t border-gray-100 pt-6">
        <Link href="/schedule" className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 press" style={{ boxShadow: '0 6px 16px rgba(220,38,38,0.35)' }}>
          期待値を計算してみる →
        </Link>
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
