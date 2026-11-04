import type { Metadata } from 'next'
import Link from 'next/link'
import { X_HANDLE, X_URL } from '../lib/siteMeta'

export const metadata: Metadata = {
  title: 'このサイトについて',
  description: '引くたびにメルカリで後悔する。それでもやめられない。そんな経験から生まれた期待値計算ツールです。',
}

export default function AboutPage() {
  return (
    <main>
      <div className="bg-stone-800 px-6 py-8 text-white">
        <p className="text-xs font-bold tracking-widest text-stone-400 mb-1">ABOUT</p>
        <h1 className="text-xl font-black">このサイトについて</h1>
      </div>

      <div className="px-6 py-8 space-y-8 text-sm text-stone-700 leading-relaxed">
        <section>
          <h2 className="text-base font-black text-stone-800 mb-3">くじのねができるまで</h2>
          <div className="space-y-3">
            <p>一番くじを引くたびに、帰り道でメルカリを開いていました。</p>
            <p>「また損した」と思いながら、次の発売日には列に並んでいる。そんなことを繰り返していました。</p>
            <p>別に後悔したくて引いているわけじゃない。でも引く前に冷静になれるタイミングがなかった。</p>
            <p>それならせめて、<strong className="text-stone-800">引く前に「平均いくらかかるか」だけでも分かれば</strong>と思って作ったのがくじのねです。</p>
          </div>
        </section>

        <section>
          <h2 className="text-base font-black text-stone-800 mb-3">このサイトでできること</h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-shu font-bold mt-0.5">•</span>
              <span>
                一番くじの<strong className="text-stone-800">期待値計算</strong>（目当ての賞が当たるまでの平均費用）
                <Link href="/calc" className="text-shu hover:underline ml-1 text-xs">→ 計算する</Link>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-shu font-bold mt-0.5">•</span>
              <span>
                直近の<strong className="text-stone-800">発売スケジュール</strong>確認
                <Link href="/schedule" className="text-shu hover:underline ml-1 text-xs">→ 見る</Link>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-shu font-bold mt-0.5">•</span>
              <span>
                各商品の<strong className="text-stone-800">賞構成・市場相場</strong>の確認
                <Link href="/schedule" className="text-shu hover:underline ml-1 text-xs">→ 商品を探す</Link>
              </span>
            </li>
          </ul>
          <p className="mt-4 text-stone-500">計算してみて「割に合わない」と思ったら引かなくていい。「これなら引く価値ある」と思ったら自信を持って引ける。そのための判断材料を提供しています。計算方法の詳細は<Link href="/method" className="text-shu hover:underline mx-1">期待値の計算方法</Link>をご覧ください。</p>
        </section>

        <section>
          <h2 className="text-base font-black text-stone-800 mb-3">データについて</h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-shu font-bold mt-0.5">•</span>
              <span><strong className="text-stone-800">発売日・価格・販売店・賞の構成：</strong>一番くじ公式サイトの掲載情報を、毎日自動で取得しています。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-shu font-bold mt-0.5">•</span>
              <span><strong className="text-stone-800">中古相場：</strong>ヤフオクの落札価格と、Yahoo!ショッピングの販売価格を、発売後に自動で取得しています（発売から1週間は毎日、その後は間隔をあけて90日まで）。取得日をあわせて表示し、60日以上更新がない値は使いません。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-shu font-bold mt-0.5">•</span>
              <span><strong className="text-stone-800">集計結果：</strong>集めたデータから、発売曜日・販売店・賞ごとの相場などをまとめて公開しています。
                <Link href="/data" className="text-shu hover:underline ml-1 text-xs">→ データで見る一番くじ</Link>
              </span>
            </li>
          </ul>
          <p className="mt-3 text-stone-500">1ロットの総本数はメーカーから公表されていないため、計算では80本と仮定しています。仮定の値を使う箇所には、その旨を表示しています。</p>
        </section>

        <section>
          <h2 className="text-base font-black text-stone-800 mb-3">運営について</h2>
          <div className="space-y-2">
            <p><span className="font-bold text-stone-800">運営者：</span>くじのね管理人</p>
            <p><span className="font-bold text-stone-800">運営開始：</span>2026年5月</p>
            <p>
              <span className="font-bold text-stone-800">X（旧Twitter）：</span>
              <a href={X_URL} target="_blank" rel="noopener noreferrer" className="text-shu hover:underline ml-1">{X_HANDLE}</a>
              <span className="text-stone-500">（発売前日のお知らせと、集計データを毎週投稿しています）</span>
            </p>
            <p><span className="font-bold text-stone-800">データの取得方針：</span><Link href="/method" className="text-shu hover:underline ml-1">期待値の計算方法</Link>に詳細を記載しています</p>
            <p>
              <span className="font-bold text-stone-800">お問い合わせ：</span>
              <Link href="/contact" className="text-shu hover:underline ml-1">こちらのフォーム</Link>からどうぞ
            </p>
          </div>
          <p className="mt-4 text-xs text-stone-400">当サイトはアフィリエイト広告（メルカリ・駿河屋・Yahoo!ショッピング・楽天市場等）を利用しているほか、Google AdSenseによる広告を掲載しています。掲載情報は参考値であり、実際の景品構成・価格とは異なる場合があります。</p>
        </section>
      </div>
    </main>
  )
}
