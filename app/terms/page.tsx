import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <main>
      <div className="bg-gray-900 px-6 py-8 text-white">
        <p className="text-xs font-bold tracking-widest text-gray-400 mb-1">TERMS</p>
        <h1 className="text-xl font-black">利用規約</h1>
      </div>
      <div className="px-6 py-8 space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-base font-black text-gray-900 mb-2">第1条（適用）</h2>
          <p>本規約は、くじのね（以下「当サイト」）が提供するサービスの利用条件を定めるものです。ユーザーは本規約に同意の上、当サイトをご利用ください。</p>
        </section>
        <section>
          <h2 className="text-base font-black text-gray-900 mb-2">第2条（免責事項）</h2>
          <p>当サイトが提供する期待値計算はあくまで参考値です。実際のくじの結果を保証するものではありません。当サイトの利用により生じた損害について、当サイトは一切の責任を負いません。</p>
        </section>
        <section>
          <h2 className="text-base font-black text-gray-900 mb-2">第3条（著作権）</h2>
          <p>当サイトのコンテンツに関する著作権は当サイトに帰属します。無断転載・複製を禁止します。</p>
        </section>
        <section>
          <h2 className="text-base font-black text-gray-900 mb-2">第4条（変更）</h2>
          <p>当サイトは、必要に応じて本規約を変更することがあります。変更後の規約はサイト上に掲載した時点で効力を生じます。</p>
        </section>
        <p className="text-xs text-gray-400 pt-4">制定日：2026年5月1日</p>
      </div>
    </main>
  )
}
