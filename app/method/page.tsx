import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '期待値の計算方法',
  description: '一番くじの「狙い賞が当たるまでの平均回数」をどう計算しているか、計算式・データの出典・計算の限界まで正直に解説します。',
  alternates: { canonical: '/method' },
}

export default function MethodPage() {
  return (
    <main>
      <div className="bg-stone-800 px-6 py-8 text-white">
        <p className="text-xs font-bold tracking-widest text-stone-400 mb-1">METHOD</p>
        <h1 className="text-xl font-black">期待値の計算方法</h1>
      </div>

      <div className="px-6 py-8 space-y-8 text-sm text-stone-700 leading-relaxed">
        <section>
          <h2 className="text-base font-black text-stone-800 mb-3">1. 掲載している数値について</h2>
          <p>「本数別の平均回数」は、<strong className="text-stone-800">目当ての賞が出るまでに平均何回引く必要があるか</strong>を示す指標です。残り本数は実店舗の在庫を取得できないため、1本・2本・3本という仮定のシナリオで計算しています。</p>
          <p className="mt-2">発売済みの商品については、A賞〜C賞クラスの「上位賞の中古相場」を、Yahoo!ショッピング・ヤフオクの実際の価格から賞ごとに集計して表示しています。<strong className="text-stone-800">これは特定の賞の相場そのものであり、くじを引いた場合に平均いくら得をするかを計算したものではありません。</strong>下位賞を含めた「1回あたりの損得」のような単一の金額は、各賞の残り本数が公開されておらず正確に計算できないため、あえて表示していません。</p>
          <p className="mt-2">ラストワン賞があるくじについては、残り本数ごとの的中確率も表示しています。こちらは相場データに依存せず、確定的に計算できる数値です。</p>
        </section>

        <section>
          <h2 className="text-base font-black text-stone-800 mb-3">2. 計算式</h2>
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 font-mono text-xs leading-relaxed overflow-x-auto">
            <p>本数別の平均回数 = (残り総本数 + 1) ÷ (狙い賞の残り本数 + 1)</p>
            <p className="mt-2">ラストワン賞の的中確率 = 1 ÷ 残り総本数</p>
          </div>
          <p className="mt-2 text-stone-500">平均回数の計算で単純な「総本数 ÷ 残り本数」ではなくこの式を使うのは、引くごとに母数が減っていく非復元抽出（一番くじは引いたくじが箱に戻らない）の期待値として正しい形だからです。</p>
        </section>

        <section>
          <h2 className="text-base font-black text-stone-800 mb-3">3. データの出典と更新頻度</h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-shu font-bold mt-0.5">•</span>
              <span>商品・賞構成データ（発売日、賞のラインナップなど）は公式発表やオンライン上の公開情報をもとに、1日1回自動更新しています。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-shu font-bold mt-0.5">•</span>
              <span>想定市場価値は、Yahoo!ショッピングの販売価格とヤフオクの落札価格帯を取得して算出しています。発売7日以内は毎日全件、発売8〜30日は毎日一部ずつローテーションで、発売31〜90日は週1回一部ずつローテーションで再取得しています。取得から60日以上経過したデータはページ上の表示から除外しています。</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-black text-stone-800 mb-3">4. 計算の限界（正直に書きます）</h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-shu font-bold mt-0.5">•</span>
              <span>一番くじの総本数は公式には非公開です。公開されている商品は実測値を使い、非公開の商品は一般的なロット構成である<strong className="text-stone-800">80本と仮定</strong>して計算しています。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-shu font-bold mt-0.5">•</span>
              <span>各賞の残り本数も店舗ごとに異なり、リアルタイムには取得できません。当サイトの「残り本数」はすべて<strong className="text-stone-800">仮定のシナリオ</strong>です。実際の残り本数は、店頭に置かれている半券表などでご確認ください。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-shu font-bold mt-0.5">•</span>
              <span>市場価値は日々変動します。掲載している相場はあくまで購入判断の参考値であり、実際の取引価格と異なる場合があります。</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-black text-stone-800 mb-3">5. 免責</h2>
          <p>当サイトは一番くじの購入を推奨するものではありません。また、掲載している計算結果の正確性を保証するものではありません。実際の購入判断は、ご自身の責任で行っていただくようお願いします。</p>
          <p className="mt-4 text-xs text-stone-400">
            サイトの運営方針については<Link href="/about" className="text-shu hover:underline mx-1">このサイトについて</Link>もご覧ください。
          </p>
        </section>
      </div>
    </main>
  )
}
