import Link from 'next/link'

// 注意書きは2行＋計算方法ページへのリンクにまとめる（以前は約250字の定型文、2026-11）。
// 残すべき要点: ①平均回数・費用は総本数を仮定した（または実測の総本数での）参考値で、店頭の残り本数とは違うこと
// ②中古相場は参考値で、古い取得値（60日超）は使っていないこと ③データの最終更新日。詳しい説明は /method に置く。
export default function Disclaimer({
  hasMarketData,
  assumed,
  totalCount,
  pageLastUpdated,
}: {
  hasMarketData: boolean
  assumed: boolean
  totalCount: number
  pageLastUpdated: string | null
}) {
  return (
    <div className="mt-2 mb-6 text-xs text-stone-400 leading-relaxed space-y-1 anim-fade-up">
      <p>
        ※平均回数・費用は、
        {assumed ? `総本数を${totalCount}本と仮定した参考値です` : `総本数${totalCount}本で計算した参考値です`}
        （店頭の実際の残り本数で結果は変わります）。
        {hasMarketData && '中古相場はYahoo!ショッピング・ヤフオクの価格をもとにした参考値で、取得から60日以内のものだけを使っています。'}
      </p>
      <p>
        {pageLastUpdated && <span className="text-stone-500">データ最終更新：{pageLastUpdated.slice(0, 10)}　</span>}
        <Link href="/method" className="text-shu hover:underline">計算方法の詳細</Link>
      </p>
    </div>
  )
}
