import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import { notFound } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import PrizeList from './PrizeList'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const { data: kuji } = await supabase.from('kuji').select('title, price, banner_url, image_url').eq('id', id).single()
  if (!kuji) return {}
  const ogImage = kuji.banner_url || kuji.image_url || '/logo.png'
  return {
    title: `${kuji.title} 期待値 | くじのね`,
    description: `${kuji.title}の期待値を計算。1回${kuji.price}円のくじを引く前に、目当ての賞が当たるまでの平均費用を確認しよう。`,
    openGraph: {
      title: `${kuji.title} 期待値 | くじのね`,
      description: `${kuji.title}の期待値を計算。1回${kuji.price}円のくじを引く前に、目当ての賞が当たるまでの平均費用を確認しよう。`,
      url: `https://kujinone.com/kuji/${id}`,
      images: [{ url: ogImage, alt: kuji.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${kuji.title} 期待値 | くじのね`,
      description: `${kuji.title}の期待値を計算。1回${kuji.price}円のくじを引く前に、目当ての賞が当たるまでの平均費用を確認しよう。`,
      images: [ogImage],
    },
  }
}

export default async function KujiDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: kuji } = await supabase.from('kuji').select('*').eq('id', id).single()
  const { data: prizes } = await supabase.from('prizes').select('*').eq('kuji_id', id).order('sort_order', { ascending: true })
  const today = new Date().toISOString().slice(0, 10)

  if (!kuji) notFound()

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: '発売スケジュール', item: 'https://kujinone.com/schedule' },
      { '@type': 'ListItem', position: 3, name: kuji.title, item: `https://kujinone.com/kuji/${id}` },
    ],
  }

  const isReleased = kuji.release_at <= today
  const searchKeyword = kuji.title.split(/\s+/).slice(0, 2).join(' ')

  // 対応する新作速報記事の有無を確認
  const newsSlug = `kuji-${kuji.product_id}`
  const newsExists = fs.existsSync(path.join(process.cwd(), 'news-posts', `${newsSlug}.md`))

  const tweetUrls: string[] = Array.isArray(kuji.tweet_urls)
    ? kuji.tweet_urls
    : typeof kuji.tweet_urls === 'string'
    ? [kuji.tweet_urls]
    : []

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="bg-gray-900 px-6 py-8 text-white">
        <Link href="/schedule" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white mb-3 transition-colors press">
          ← 戻る
        </Link>
        {(kuji.banner_url || kuji.image_url) && (
          <div className="mb-4 rounded-xl overflow-hidden w-full">
            <Image src={kuji.banner_url || kuji.image_url} alt={kuji.title} width={600} height={400} className="w-full h-auto" sizes="(max-width: 768px) 100vw, 640px" priority />
          </div>
        )}
        {kuji.release_at && (
          <span className="inline-block text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-semibold mb-2">{kuji.release_at.split('-').slice(1).map(Number).join('月')}日発売</span>
        )}
        <h1 className="text-lg font-black leading-snug">{kuji.title}</h1>
        <div className="flex gap-2 mt-2">
          <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">{kuji.price}円/回</span>
          {kuji.total > 0 && <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">全{kuji.total}本</span>}
        </div>
      </div>

      <div className="px-5 py-6">
        {tweetUrls.length > 0 && (
          <div className="mb-6 anim-fade-up" style={{ animationDelay: '140ms' }}>
            <h2 className="text-xs font-black text-gray-400 tracking-wider mb-3">公式情報 / OFFICIAL</h2>
            {tweetUrls.map((url, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white text-xs font-black">X</div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">一番くじ公式</p>
                    <p className="text-xs text-gray-400">@ichibanKUJI</p>
                  </div>
                </div>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 font-semibold hover:underline">
                  公式ポストを見る →
                </a>
              </div>
            ))}
          </div>
        )}

        {prizes && prizes.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-black text-gray-400 tracking-wider mb-3 anim-fade-up" style={{ animationDelay: '180ms' }}>賞一覧 / PRIZES</h2>
            <PrizeList prizes={prizes} />
          </div>
        )}

        <Link
          href={`/calc?kuji_id=${id}`}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-red-600 text-white text-sm font-black rounded-xl hover:bg-red-700 press anim-fade-up mb-6"
          style={{ animationDelay: `${200 + (prizes?.length || 0) * 60}ms`, boxShadow: '0 6px 16px rgba(220,38,38,0.35)' }}
        >
          この商品の期待値を計算する →
        </Link>

        {isReleased && (
          <div className="mb-6 anim-fade-up" style={{ animationDelay: `${260 + (prizes?.length || 0) * 60}ms` }}>
            <h2 className="text-xs font-black text-gray-400 tracking-wider mb-3">相場を確認・購入する / MARKET</h2>
            <div className="space-y-2">
              {[
                { href: `https://jp.mercari.com/search?keyword=${encodeURIComponent(searchKeyword)}`, label: "メルカリで相場を見る", sub: "出品価格を確認", color: "bg-red-50 border-red-200 text-red-600" },
                { href: `https://affiliate.suruga-ya.jp/modules/af/af_jump.php?user_id=5303&goods_url=https%3A%2F%2Fwww.suruga-ya.jp%2Fsearch%3Fsearch_word%3D${encodeURIComponent(searchKeyword)}`, label: "駿河屋で相場を見る", sub: "在庫あり最安値を確認", color: "bg-blue-50 border-blue-200 text-blue-600" },
                { href: `https://af.moshimo.com/af/c/click?a_id=5570999&p_id=1225&pc_id=1925&pl_id=18502`, label: "Yahoo!ショッピングで見る", sub: "新品・中古の価格を確認", color: "bg-amber-50 border-amber-200 text-amber-600" },
                { href: `https://af.moshimo.com/af/c/click?a_id=5570988&p_id=54&pc_id=54&pl_id=621`, label: "楽天市場で見る", sub: "ポイントを使ってお得に購入", color: "bg-pink-50 border-pink-200 text-pink-600" },
              ].map((link, i) => (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 p-3 border rounded-xl ${link.color} press anim-fade-up`} style={{ animationDelay: `${280 + (prizes?.length || 0) * 60 + i * 60}ms` }}>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{link.label}</p>
                    <p className="text-xs opacity-70">{link.sub}</p>
                  </div>
                  <span className="text-sm">↗</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100">
          {newsExists && (
            <div className="mb-6 anim-fade-up">
              <h2 className="text-xs font-black text-gray-400 tracking-wider mb-3">新作速報 / NEWS</h2>
              <Link
                href={`/news/${newsSlug}`}
                className="flex items-center gap-3 p-3 border rounded-xl bg-red-50 border-red-200 text-red-700 press"
              >
                <div className="flex-1">
                  <p className="text-sm font-bold">このくじの賞品・期待値まとめ記事</p>
                  <p className="text-xs opacity-70">発売日・全賞品・期待値の目安を解説</p>
                </div>
                <span className="text-sm">↗</span>
              </Link>
            </div>
          )}
          <h2 className="text-xs font-black text-gray-400 tracking-wider mb-3">関連コラム / COLUMN</h2>
          <div className="space-y-0">
            {[
              { href: '/blog/kitaichi-toha', title: '一番くじの期待値とは？計算方法をわかりやすく解説' },
              { href: '/blog/ichiban-kuji-toha', title: '一番くじとは？仕組み・賞の種類・値段・お得な引き方を徹底解説' },
              { href: '/blog/kuji-vs-mercari', title: '一番くじ vs メルカリ どちらがお得？賢い選び方を解説' },
            ].map((post, i) => (
              <Link
                key={post.href}
                href={post.href}
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
      </div>
    </main>
  )
}
