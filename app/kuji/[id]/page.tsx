import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import PrizeList from './PrizeList'

export default async function KujiDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: kuji } = await supabase.from('kuji').select('*').eq('id', id).single()
  const { data: prizes } = await supabase.from('prizes').select('*').eq('kuji_id', id).order('sort_order', { ascending: true })
  const today = new Date().toISOString().slice(0, 10)

  if (!kuji) return <div className="p-6 text-sm text-gray-400">くじが見つかりません</div>

  const isReleased = kuji.release_at <= today
  const searchKeyword = kuji.title.split(/\s+/).slice(0, 2).join(' ')

  const tweetUrls: string[] = Array.isArray(kuji.tweet_urls)
    ? kuji.tweet_urls
    : typeof kuji.tweet_urls === 'string'
    ? [kuji.tweet_urls]
    : []

  return (
    <main>
      <div className="bg-gray-900 px-6 py-8 text-white">
        <Link href="/schedule" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white mb-3 transition-colors press">
          ← 戻る
        </Link>
        {kuji.image_url && (
          <div className="mb-4 rounded-xl overflow-hidden w-full">
            <Image src={kuji.image_url} alt={kuji.title} width={600} height={400} className="w-full h-auto" />
          </div>
        )}
        <span className="inline-block text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-semibold mb-2">{kuji.release_at.split('-').slice(1).map(Number).join('月')}日発売</span>
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

        {isReleased && (
          <div className="mb-6 anim-fade-up" style={{ animationDelay: `${260 + (prizes?.length || 0) * 60}ms` }}>
            <h2 className="text-xs font-black text-gray-400 tracking-wider mb-3">相場を確認・購入する / MARKET</h2>
            <div className="space-y-2">
              {[
                { href: `https://px.a8.net/svt/ejp?a8mat=4B3MEQ+DIF6SA+5LNQ+5YJRM`, label: "メルカリで相場を見る", sub: "出品価格を確認", color: "bg-red-50 border-red-200 text-red-600" },
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

        <Link
          href={`/calc?kuji_id=${id}`}
          className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 text-white text-sm font-black rounded-xl hover:bg-red-700 press anim-fade-up"
          style={{ animationDelay: `${260 + (prizes?.length || 0) * 60}ms`, boxShadow: '0 6px 16px rgba(220,38,38,0.35)' }}
        >
          この商品の期待値を計算する →
        </Link>
      </div>
    </main>
  )
}
