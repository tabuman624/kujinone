import type { Metadata } from 'next'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'
import { notFound } from 'next/navigation'

const NEWS_DIR = path.join(process.cwd(), 'news-posts')

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const filePath = path.join(NEWS_DIR, `${slug}.md`)
  if (!fs.existsSync(filePath)) notFound()
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data } = matter(raw)
  const description = String(data.summary || '')
  const ogImage = String(data.image_url || '/logo.png')
  return {
    title: `${data.title} | くじのね`,
    description,
    openGraph: {
      title: `${data.title} | くじのね`,
      description,
      url: `https://kujinone.com/news/${slug}`,
      images: [{ url: ogImage, alt: String(data.title) }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${data.title} | くじのね`,
      description,
      images: [ogImage],
    },
  }
}

function fmt(d: string) {
  const dt = new Date(d)
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const filePath = path.join(NEWS_DIR, `${slug}.md`)
  if (!fs.existsSync(filePath)) notFound()
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  const html = await marked(content)

  const title = String(data.title || '')
  const releaseDate = String(data.release_date || data.date || '')
  const today = new Date().toISOString().slice(0, 10)
  const isUpcoming = releaseDate >= today

  const ogImage = String(data.image_url || '/logo.png')

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: '新作速報', item: 'https://kujinone.com/news' },
      { '@type': 'ListItem', position: 3, name: title, item: `https://kujinone.com/news/${slug}` },
    ],
  }

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description: String(data.summary || ''),
    datePublished: String(data.date),
    dateModified: String(data.date),
    image: ogImage.startsWith('http') ? ogImage : `https://kujinone.com${ogImage}`,
    author: { '@type': 'Organization', name: 'くじのね', url: 'https://kujinone.com' },
    publisher: {
      '@type': 'Organization',
      name: 'くじのね',
      url: 'https://kujinone.com',
      logo: { '@type': 'ImageObject', url: 'https://kujinone.com/logo.png' },
    },
    url: `https://kujinone.com/news/${slug}`,
  }

  return (
    <main style={{ background: '#fff' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      {/* Header */}
      <div className="px-6 pt-5 pb-7 bg-gray-900 text-white">
        <Link href="/news" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white mb-4 press transition-colors">
          ← 新作速報に戻る
        </Link>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold tracking-[0.18em] text-red-400">NEWS</span>
          {releaseDate && (
            <>
              <span className="text-gray-600">·</span>
              <span className="text-[11px] text-gray-400">{fmt(releaseDate)}発売</span>
            </>
          )}
          {isUpcoming
            ? <span className="text-[9px] font-bold text-red-400 bg-red-900/40 px-1.5 py-0.5 rounded-full">発売予定</span>
            : <span className="text-[9px] font-bold text-gray-400 bg-white/10 px-1.5 py-0.5 rounded-full">発売済み</span>
          }
        </div>
        <h1 className="text-xl font-black leading-snug" style={{ textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{title}</h1>
      </div>

      {/* Content */}
      <div className="px-5 py-7">
        <div
          className="kuji-prose--article anim-fade-up"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {/* CTAs */}
      <div className="px-5 pb-8 space-y-3 border-t border-gray-100 pt-6">
        {data.kuji_id && (
          <Link
            href={`/kuji/${data.kuji_id}`}
            className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 text-white text-sm font-black rounded-xl hover:bg-red-700 press"
            style={{ boxShadow: '0 6px 16px rgba(220,38,38,0.35)' }}
          >
            この商品の期待値を計算する →
          </Link>
        )}
        <a
          href="https://click.linksynergy.com/fs-bin/click?id=txstqLlFvt4&offerid=1366097.2&type=3&subid=0"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 border rounded-xl bg-purple-50 border-purple-200 text-purple-700 press"
        >
          <div className="flex-1">
            <p className="text-sm font-bold">一番くじONLINEはこちら</p>
            <p className="text-xs opacity-70">PR</p>
          </div>
          <span className="text-sm">↗</span>
        </a>
        <img src="https://ad.linksynergy.com/fs-bin/show?id=txstqLlFvt4&bids=1366097.2&type=3&subid=0" width={1} height={1} alt="" />
        <Link
          href="/news"
          className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 press"
        >
          新作速報一覧に戻る
        </Link>
      </div>
    </main>
  )
}

export async function generateStaticParams() {
  if (!fs.existsSync(NEWS_DIR)) return []
  const files = fs.readdirSync(NEWS_DIR).filter(f => f.endsWith('.md'))
  return files.map(f => ({ slug: f.replace('.md', '') }))
}
