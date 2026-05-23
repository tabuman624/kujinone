import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

const gradeColors: { [key: string]: string } = {
  'A賞': 'bg-amber-100 text-amber-800',
  'B賞': 'bg-blue-100 text-blue-700',
  'C賞': 'bg-emerald-100 text-emerald-700',
  'D賞': 'bg-purple-100 text-purple-700',
  'E賞': 'bg-gray-100 text-gray-700',
}

export default async function KujiDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: kuji } = await supabase.from('kuji').select('*').eq('id', id).single()
  const { data: prizes } = await supabase.from('prizes').select('*').eq('kuji_id', id).order('sort_order', { ascending: true })

  if (!kuji) return <div className="p-6 text-sm text-gray-400">くじが見つかりません</div>

  const tweetUrls: string[] = Array.isArray(kuji.tweet_urls)
    ? kuji.tweet_urls
    : typeof kuji.tweet_urls === 'string'
    ? [kuji.tweet_urls]
    : []

  return (
    <main>
      <div className="bg-gray-900 px-6 py-8 text-white">
        <Link href="/schedule" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white mb-3 transition-colors press">
          ← スケジュール
        </Link>
        {kuji.image_url && (
          <div className="mb-4 rounded-xl overflow-hidden w-full" style={{ maxHeight: 200 }}>
            <Image src={kuji.image_url} alt={kuji.title} width={600} height={200} className="w-full object-cover" />
          </div>
        )}
        <span className="inline-block text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-semibold mb-2">{kuji.release_at}発売</span>
        <h1 className="text-lg font-black leading-snug">{kuji.title}</h1>
        <div className="flex gap-2 mt-2">
          <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">{kuji.price}円/回</span>
          {kuji.total && <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">全{kuji.total}本</span>}
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
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {prizes.map((prize: any, i: number) => (
                <div
                  key={prize.id}
                  className={`flex items-center gap-3 px-4 py-3 anim-fade-up ${i !== prizes.length - 1 ? 'border-b border-gray-100' : ''}`}
                  style={{ animationDelay: `${220 + i * 60}ms` }}
                >
                  {prize.image_url ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50">
                      <Image src={prize.image_url} alt={prize.name} width={48} height={48} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-50 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeColors[prize.grade] || 'bg-gray-100 text-gray-700'}`}>{prize.grade}</span>
                    <p className="text-sm text-gray-800 font-medium mt-0.5 truncate">{prize.name}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{prize.total}本</span>
                </div>
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
