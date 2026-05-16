import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

function fmt(d: string) {
  const dt = new Date(d)
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`
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
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const featured = posts[0]
  const rest = posts.slice(1)

  return (
    <main style={{ background: '#fafafa' }}>
      {/* Light header */}
      <div className="px-6 pt-6 pb-6 bg-white border-b border-gray-100">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[11px] font-bold tracking-[0.18em] text-red-600">COLUMN</p>
          <span className="text-[11px] text-gray-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{posts.length} ARTICLES</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-1">コラム</h1>
        <p className="text-xs text-gray-500">一番くじをもっと賢く楽しむためのガイド</p>
      </div>

      {/* Featured */}
      {featured && (
        <div className="px-5 pt-5">
          <p className="text-[10px] font-bold tracking-[0.18em] text-gray-400 mb-2">FEATURED</p>
          <Link
            href={`/blog/${featured.slug}`}
            className="relative block w-full text-left rounded-2xl overflow-hidden press anim-fade-up"
            style={{
              background: 'linear-gradient(135deg, #1f2937 0%, #0f172a 100%)',
              padding: '20px 22px 22px',
              minHeight: 200,
              animationDelay: '40ms',
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                right: -12,
                bottom: -28,
                fontSize: 150,
                lineHeight: 1,
                fontWeight: 900,
                color: 'rgba(255,255,255,0.06)',
                letterSpacing: '-0.06em',
                fontVariantNumeric: 'tabular-nums',
                pointerEvents: 'none',
              }}
            >01</span>
            <div style={{ position: 'relative' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold tracking-wider">NEW</span>
                <span className="text-[11px] text-red-300 font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(featured.date)}</span>
              </div>
              <h2 className="text-[17px] font-black text-white leading-snug mb-2" style={{ textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{featured.title}</h2>
              <p className="text-xs text-gray-300 leading-relaxed line-clamp-2 mb-4">{featured.summary}</p>
              <span className="inline-flex items-center gap-1 text-xs text-red-400 font-bold">
                記事を読む
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* Article list */}
      <div className="px-5 pt-7 pb-2">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-[11px] font-bold tracking-[0.18em] text-gray-400">ALL ARTICLES</h2>
          <span className="text-[11px] text-gray-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{rest.length} 件</span>
        </div>
      </div>

      <div className="px-5 pb-6">
        {rest.map((post, i) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="w-full text-left flex items-start gap-4 py-4 border-t border-gray-200 press anim-fade-up group"
            style={{ animationDelay: `${60 + i * 35}ms` }}
          >
            <span className="text-[15px] font-black text-gray-300 mt-0.5" style={{ minWidth: 28, fontVariantNumeric: 'tabular-nums' }}>
              {String(i + 2).padStart(2, '0')}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 tracking-wider font-semibold mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(post.date)}</p>
              <p className="text-[13.5px] font-bold text-gray-900 leading-snug mb-1 group-hover:text-red-600 transition-colors" style={{ textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{post.title}</p>
              <p className="text-[11.5px] text-gray-500 leading-relaxed line-clamp-1">{post.summary}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-2 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </main>
  )
}
