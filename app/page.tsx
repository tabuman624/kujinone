import Image from 'next/image'
import Link from 'next/link'
import { supabase } from './lib/supabase'

function fmtDate(d: string) {
  const dt = new Date(d)
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`
}

export default async function Home() {
  const { data: kujiList } = await supabase
    .from('kuji')
    .select('*')
    .eq('is_active', true)
    .order('release_at', { ascending: true })

  // Hard-coded featured columns on the home page (same 3 as the original)
  const featuredPosts = [
    { slug: 'ichiban-kuji-toha', title: '一番くじとは？初心者向けに仕組みをわかりやすく解説', date: '2026-05-01', summary: '一番くじの基本的な仕組みや賞の種類、どこで買えるのかを初心者向けにわかりやすく解説します。' },
    { slug: 'kitaichi-toha', title: '一番くじの期待値とは？計算方法をわかりやすく解説', date: '2026-05-01', summary: '一番くじで目当ての賞を引くまでに平均いくらかかるかを示す「期待値」の計算方法を解説します。' },
    { slug: 'kuji-vs-mercari', title: '一番くじ vs メルカリ どちらがお得？', date: '2026-05-01', summary: '一番くじを引くのとフリマアプリで購入するのと、どちらがお得かを比較・解説します。' },
  ]

  return (
    <main>
      {/* Hero — minimal: headline + single CTA */}
      <div className="bg-gray-900 px-6 text-white" style={{ paddingTop: 56, paddingBottom: 52 }}>
        <h1 className="text-[28px] font-black leading-[1.25] mb-6 anim-fade-up" style={{ animationDelay: '60ms', textWrap: 'balance' as React.CSSProperties['textWrap'] }}>
          くじを引く前に、<br />期待値を確認。
        </h1>
        <Link
          href="/schedule"
          className="inline-flex items-center gap-2 bg-red-600 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-red-700 press anim-fade-up"
          style={{ animationDelay: '180ms', boxShadow: '0 6px 16px rgba(220,38,38,0.4)' }}
        >
          計算する
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Schedule */}
      <div className="px-5 py-7">
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <h2 className="text-base font-black text-gray-900">発売スケジュール</h2>
            <p className="text-xs text-red-500 font-bold tracking-wider">SCHEDULE</p>
          </div>
          <Link href="/schedule" className="text-xs text-red-600 font-semibold hover:underline press">一覧を見る →</Link>
        </div>
        <div className="space-y-3">
          {kujiList?.map((kuji, i) => (
            <Link
              key={kuji.id}
              href={`/kuji/${kuji.id}`}
              className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl card-hover hover:border-red-300 hover:shadow-md press anim-fade-up"
              style={{ animationDelay: `${80 + i * 70}ms` }}
            >
              <div className="w-12 h-12 bg-red-50 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
                {kuji.image_url ? (
                  <Image src={kuji.image_url} alt={kuji.title} width={48} height={48} className="w-full h-full object-cover" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">{kuji.release_at}発売</span>
                <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{kuji.title}</p>
                <p className="text-xs text-gray-500">{kuji.price}円/回{kuji.total ? ` · 全${kuji.total}本` : ''}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Column — numbered list matching /blog list style */}
      <div className="px-5 pb-7">
        <div className="border-t border-gray-100 pt-6 mb-3">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-base font-black text-gray-900">コラム</h2>
              <p className="text-xs text-red-500 font-bold tracking-wider">COLUMN</p>
            </div>
            <Link href="/blog" className="text-xs text-red-600 font-semibold hover:underline press">一覧を見る →</Link>
          </div>
        </div>
        <div>
          {featuredPosts.map((post, i) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="w-full text-left flex items-start gap-4 py-4 border-t border-gray-200 press anim-fade-up group"
              style={{ animationDelay: `${120 + i * 50}ms` }}
            >
              <span className="text-[15px] font-black text-gray-300 mt-0.5" style={{ minWidth: 28, fontVariantNumeric: 'tabular-nums' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 tracking-wider font-semibold mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDate(post.date)}</p>
                <p className="text-[13.5px] font-bold text-gray-900 leading-snug mb-1 group-hover:text-red-600 transition-colors" style={{ textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{post.title}</p>
                <p className="text-[11.5px] text-gray-500 leading-relaxed line-clamp-1">{post.summary}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-2 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
