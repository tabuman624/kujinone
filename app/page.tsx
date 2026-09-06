import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { supabase } from './lib/supabase'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '一番くじ 期待値計算ツール | くじのね',
  description: '一番くじ（いちばんくじ・1番くじ）の期待値を無料で計算。目当ての賞が当たるまでの平均費用を秒で算出。発売スケジュール・ヤフオク落札相場も確認できます。',
  alternates: { canonical: '/' },
  openGraph: {
    title: '一番くじ 期待値計算ツール | くじのね',
    description: '一番くじ（いちばんくじ・1番くじ）の期待値を無料で計算。目当ての賞が当たるまでの平均費用を秒で算出。発売スケジュール・ヤフオク落札相場も確認できます。',
    url: 'https://kujinone.com',
    images: [{ url: '/logo.png', alt: 'くじのね' }],
  },
}

function fmtDate(d: string) {
  const dt = new Date(d)
  return `${dt.getMonth() + 1}月${dt.getDate()}日`
}

function fmtRelease(d: string) {
  const [, m, day] = d.split('-')
  return `${parseInt(m)}月${parseInt(day)}日`
}

export default async function Home() {
  const today = new Date().toISOString().slice(0, 10)
  const { data: kujiList } = await supabase
    .from('kuji')
    .select('*')
    .eq('is_active', true)
    .gte('release_at', today)
    .order('release_at', { ascending: true })
    .limit(5)

  const postsDir = path.join(process.cwd(), 'posts')
  const featuredSlugs = ['kitaichi-toha', 'ichiban-kuji-toha', 'ichiban-kuji-last-one', 'kuji-vs-mercari']
  const featuredPosts = featuredSlugs.map(slug => {
    const raw = fs.readFileSync(path.join(postsDir, `${slug}.md`), 'utf-8')
    const { data } = matter(raw)
    return { slug, title: String(data.title || ''), date: String(data.date || ''), summary: String(data.summary || '') }
  })

  return (
    <main>
      {/* Organization/WebSiteの構造化データはapp/layout.tsxで全ページ共通出力している。
          旧SearchActionはサイト内検索機能が存在せずurlTemplateも無効だったため削除済み。 */}
      {/* Hero */}
      <div className="px-5 pt-[34px] pb-[26px] text-center">
        <img
          src="/logo-mark.svg"
          alt=""
          width={56}
          height={56}
          className="mx-auto mb-4 anim-fade-up"
          style={{ animationDelay: '40ms' }}
        />
        <h1
          className="text-[21px] font-semibold leading-[1.45] tracking-[0.01em] text-stone-800 text-balance anim-fade-up"
          style={{ animationDelay: '70ms' }}
        >
          期待値でねらう、一番くじ
        </h1>
        <p className="text-[13px] text-stone-500 leading-[1.8] mt-2.5 anim-fade-up" style={{ animationDelay: '90ms' }}>
          商品を選ぶだけで、1回あたりの<br />損得と損益ラインがわかります。
        </p>
        <Link
          href="/calc"
          className="block bg-shu text-white text-[15px] font-semibold py-3.5 rounded-[10px] mt-6 press hover:bg-shu-dark transition-colors anim-fade-up"
          style={{ animationDelay: '120ms' }}
        >
          期待値を計算する
        </Link>
        <Link
          href="/schedule"
          className="block border border-stone-200 text-stone-600 text-[13.5px] font-medium py-3 rounded-[10px] mt-2.5 press anim-fade-up"
          style={{ animationDelay: '150ms' }}
        >
          発売スケジュール
        </Link>
      </div>

      {/* Hero decorative bar band */}
      <div aria-hidden className="flex items-end justify-center gap-1.5 h-[38px]">
        {[15, 24, 12, 31, 18, 26, 14, 21].map((h, i) => (
          <span
            key={i}
            className={`w-2.5 rounded-t-[5px] ${i === 3 ? 'bg-shu' : 'bg-stone-200'}`}
            style={{ height: h }}
          />
        ))}
      </div>

      {/* Schedule */}
      <div className="px-5 py-7">
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <h2 className="text-base font-black text-stone-800">発売スケジュール</h2>
            <p className="text-xs text-shu font-bold tracking-wider">SCHEDULE</p>
          </div>
          <Link href="/schedule" className="text-xs text-shu font-semibold hover:underline press">一覧を見る →</Link>
        </div>
        <div className="space-y-3">
          {kujiList?.map((kuji, i) => (
            <Link
              key={kuji.id}
              href={`/kuji/${kuji.id}`}
              className="flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-xl card-hover hover:border-shu hover:shadow-md press anim-fade-up"
              style={{ animationDelay: `${80 + i * 70}ms` }}
            >
              <div className="w-12 h-12 bg-shu-bg rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
                {kuji.image_url ? (
                  <Image src={kuji.image_url} alt={kuji.title} width={48} height={48} className="w-full h-full object-cover" sizes="48px" unoptimized />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-shu" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs bg-shu-bg text-shu px-2 py-0.5 rounded-full font-semibold">{fmtRelease(kuji.release_at)}発売</span>
                <p className="text-sm font-bold text-stone-800 mt-0.5 truncate">{kuji.title}</p>
                <p className="text-xs text-stone-500">{kuji.price}円/回{kuji.total ? ` · 全${kuji.total}本` : ''}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Column — numbered list matching /blog list style */}
      <div className="px-5 pb-7">
        <div className="border-t border-stone-100 pt-6 mb-3">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-base font-black text-stone-800">コラム</h2>
              <p className="text-xs text-shu font-bold tracking-wider">COLUMN</p>
            </div>
            <Link href="/blog" className="text-xs text-shu font-semibold hover:underline press">一覧を見る →</Link>
          </div>
        </div>
        <div>
          {featuredPosts.map((post, i) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="w-full text-left flex items-start gap-4 py-4 border-t border-stone-200 press anim-fade-up group"
              style={{ animationDelay: `${120 + i * 50}ms` }}
            >
              <span className="text-[15px] font-black text-stone-300 mt-0.5" style={{ minWidth: 28, fontVariantNumeric: 'tabular-nums' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-stone-400 tracking-wider font-semibold mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDate(post.date)}</p>
                <p className="text-[13.5px] font-bold text-stone-800 leading-snug mb-1 group-hover:text-shu transition-colors" style={{ textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{post.title}</p>
                <p className="text-[11.5px] text-stone-500 leading-relaxed line-clamp-1">{post.summary}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-stone-300 flex-shrink-0 mt-2 group-hover:text-shu transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* 一番くじとは？ */}
      <div className="mx-5 mb-6 p-4 bg-shu-bg rounded-xl border border-shu-bg">
        <h2 className="text-sm font-black text-stone-800 mb-1">一番くじ（いちばんくじ）とは？</h2>
        <p className="text-xs text-stone-600 leading-relaxed mb-2">
          バンダイスピリッツが展開するハズレなしのキャラクターくじ（1回700〜800円）。ドラゴンボール・ワンピースなど人気アニメのフィギュアが必ず当たります。
        </p>
        <Link href="/blog/ichiban-kuji-toha" className="text-xs text-shu font-bold hover:underline">
          詳しく見る →
        </Link>
      </div>

      {/* フッターリンク（スマホのみ、PCはサイドナビに表示済み） */}
      <div className="md:hidden px-5 pb-8 pt-2 border-t border-stone-100">
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-2">
          {[
            { href: '/privacy', label: 'プライバシーポリシー' },
            { href: '/terms', label: '利用規約' },
            { href: '/howto', label: '使い方' },
            { href: '/contact', label: 'お問い合わせ' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="text-xs text-stone-400 hover:text-shu transition-colors">
              {item.label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-stone-300">© 2026 くじのね</p>
      </div>
    </main>
  )
}
