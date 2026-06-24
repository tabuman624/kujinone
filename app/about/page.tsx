import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'このサイトについて | くじのね',
  description: '引くたびにメルカリで後悔する。それでもやめられない。そんな経験から生まれた期待値計算ツールです。',
}

export default function AboutPage() {
  return (
    <main>
      <div className="bg-gray-900 px-6 py-8 text-white">
        <p className="text-xs font-bold tracking-widest text-gray-400 mb-1">ABOUT</p>
        <h1 className="text-xl font-black">このサイトについて</h1>
      </div>

      <div className="px-6 py-8 space-y-8 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-base font-black text-gray-900 mb-3">くじのねができるまで</h2>
          <div className="space-y-3">
            <p>一番くじを引くたびに、帰り道でメルカリを開いていました。</p>
            <p>「また損した」と思いながら、次の発売日には列に並んでいる。そんなことを繰り返していました。</p>
            <p>別に後悔したくて引いているわけじゃない。でも引く前に冷静になれるタイミングがなかった。</p>
            <p>それならせめて、<strong className="text-gray-900">引く前に「平均いくらかかるか」だけでも分かれば</strong>と思って作ったのがくじのねです。</p>
          </div>
        </section>

        <section>
          <h2 className="text-base font-black text-gray-900 mb-3">このサイトでできること</h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold mt-0.5">•</span>
              <span>一番くじの<strong className="text-gray-900">期待値計算</strong>（目当ての賞が当たるまでの平均費用）</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold mt-0.5">•</span>
              <span>直近の<strong className="text-gray-900">発売スケジュール</strong>確認</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold mt-0.5">•</span>
              <span><strong className="text-gray-900">メルカリ・駿河屋の相場</strong>との比較</span>
            </li>
          </ul>
          <p className="mt-4 text-gray-500">計算してみて「割に合わない」と思ったら引かなくていい。「これなら引く価値ある」と思ったら自信を持って引ける。そのための判断材料を提供しています。</p>
        </section>

        <section>
          <h2 className="text-base font-black text-gray-900 mb-3">運営について</h2>
          <div className="space-y-2">
            <p><span className="font-bold text-gray-900">運営者：</span>くじのね管理人</p>
            <p>
              <span className="font-bold text-gray-900">お問い合わせ：</span>
              <Link href="/contact" className="text-red-600 hover:underline ml-1">こちらのフォーム</Link>からどうぞ
            </p>
          </div>
          <p className="mt-4 text-xs text-gray-400">当サイトはアフィリエイト広告（楽天・Amazon・駿河屋等）を利用しています。掲載情報は参考値であり、実際の景品構成・価格とは異なる場合があります。</p>
        </section>
      </div>
    </main>
  )
}
