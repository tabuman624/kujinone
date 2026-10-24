import Link from 'next/link'

export default function Disclaimer({ hasMarketData, totalCountSource }: { hasMarketData: boolean; totalCountSource: 'measured' | 'default' | null }) {
  return (
    <div className="mt-2 mb-6 text-xs text-stone-400 leading-relaxed space-y-1 anim-fade-up">
      <p className="font-bold text-stone-500">【この計算について】</p>
      <p>・ここでの「残り本数」は、実店舗の在庫数を取得できないため、店頭の半券表などで確認できる本数を仮定して計算した参考値です。</p>
      {totalCountSource === 'default' && (
        <p>・総本数が公開されていない商品は、一般的なロット構成である80本を仮定して計算しています。</p>
      )}
      {hasMarketData && (
        <p>・想定市場価値は、Yahoo!ショッピング・ヤフオクの出品価格をもとにした参考値です。</p>
      )}
      <p>
        ・計算方法の詳細は
        <Link href="/method" className="text-shu hover:underline mx-1">期待値の計算方法</Link>
        をご覧ください。
      </p>
    </div>
  )
}
