import Link from 'next/link'

// 「このくじのデータ」の末尾。データの最終更新日と、計算方法ページへのリンクだけを置く（2026-11-15）。
// 以前あった「※平均回数・費用は、総本数を80本と仮定した参考値です…」の注意書きは、くどいので外した。
// 仮定であることは、上の箱（総本数（仮定）・ロット総額（仮定））と平均回数の見出し（総本数80本と仮定）で示している。
// 相場の取り方（Yahoo!ショッピング・ヤフオク、取得から60日以内）は /method に書いてある。
export default function Disclaimer({ pageLastUpdated }: { pageLastUpdated: string | null }) {
  return (
    <p className="mt-2 mb-6 text-xs text-stone-400 leading-relaxed anim-fade-up">
      {pageLastUpdated && <span className="text-stone-500">データ最終更新：{pageLastUpdated.slice(0, 10)}　</span>}
      <Link href="/method" className="text-shu hover:underline">計算方法の詳細</Link>
    </p>
  )
}
