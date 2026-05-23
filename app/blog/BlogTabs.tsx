'use client'
import Link from 'next/link'
import { useState } from 'react'

type Post = {
  slug: string
  title: string
  date: string
  summary: string
  category: string
}

const CATEGORIES = ['すべて', '基礎', '期待値', '攻略', '相場', '景品'] as const

function fmt(d: string) {
  const dt = new Date(d)
  return `${dt.getMonth() + 1}月${dt.getDate()}日`
}

export default function BlogTabs({ featured, posts }: { featured: Post; posts: Post[] }) {
  const [selected, setSelected] = useState<string>('すべて')

  const filtered = selected === 'すべて' ? posts : posts.filter(p => p.category === selected)

  return (
    <>
      {/* Featured */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[10px] font-bold tracking-[0.18em] text-gray-400 mb-2">FEATURED</p>
        <Link
          href={`/blog/${featured.slug}`}
          className="relative block w-full text-left rounded-2xl overflow-hidden press anim-fade-up"
          style={{
            background: 'linear-gradient(135deg, #1f2937 0%, #0f172a 100%)',
            padding: '20px 22px 22px',
            minHeight: 160,
            animationDelay: '40ms',
          }}
        >
          <span
            aria-hidden
            style={{
              position: 'absolute', right: -12, bottom: -28,
              fontSize: 150, lineHeight: 1, fontWeight: 900,
              color: 'rgba(255,255,255,0.06)', letterSpacing: '-0.06em',
              fontVariantNumeric: 'tabular-nums', pointerEvents: 'none',
            }}
          >01</span>
          <div style={{ position: 'relative' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold tracking-wider">PICK UP</span>
              <span className="text-[11px] text-red-300 font-bold">{fmt(featured.date)}</span>
            </div>
            <h2 className="text-[16px] font-black text-white leading-snug mb-2" style={{ textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{featured.title}</h2>
            <p className="text-xs text-gray-300 leading-relaxed line-clamp-2 mb-3">{featured.summary}</p>
            <span className="inline-flex items-center gap-1 text-xs text-red-400 font-bold">
              記事を読む
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </Link>
      </div>

      {/* Category tabs */}
      <div className="flex border-b border-gray-200 px-4 sticky top-0 bg-white z-10 select-none mt-4">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelected(cat)}
            draggable={false}
            className={`flex-shrink-0 px-3 py-3 text-xs font-bold transition-colors border-b-2 -mb-px ${
              selected === cat
                ? 'text-red-600 border-red-600'
                : 'text-gray-400 border-transparent hover:text-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Article list */}
      <div className="px-5 pt-4 pb-2 flex items-baseline justify-between">
        <h2 className="text-[11px] font-bold tracking-[0.18em] text-gray-400">
          {selected === 'すべて' ? 'ALL ARTICLES' : selected.toUpperCase()}
        </h2>
        <span className="text-[11px] text-gray-400">{filtered.length} 件</span>
      </div>

      <div className="px-5 pb-6">
        {filtered.map((post, i) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="w-full text-left flex items-start gap-4 py-4 border-t border-gray-200 press anim-fade-up group"
            style={{ animationDelay: `${40 + i * 30}ms` }}
          >
            <span className="text-[13px] font-black text-gray-300 mt-0.5 flex-shrink-0" style={{ minWidth: 28, fontVariantNumeric: 'tabular-nums' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full tracking-wide">{post.category}</span>
                <p className="text-[10px] text-gray-400 font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(post.date)}</p>
              </div>
              <p className="text-[13.5px] font-bold text-gray-900 leading-snug mb-0.5 group-hover:text-red-600 transition-colors" style={{ textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{post.title}</p>
              <p className="text-[11.5px] text-gray-500 leading-relaxed line-clamp-1">{post.summary}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-2 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </>
  )
}
