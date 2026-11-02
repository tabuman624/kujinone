import Link from 'next/link'
// 注: ../../lib は app/lib を指す（ルート直下の lib/ とは別の実体）
import { expectedDraws } from '../../lib/ev'
import { freshValue } from '../../lib/priceFreshness'

// 期待値まわりの部品。並べ方と開閉は「このくじのデータ」（KujiDataSection）が決める
// （2026-11、「このくじのデータ」と「この一番くじの期待値」の2つの欄を1つにまとめた）。

export type EvPrize = {
  grade: string
  name: string
  total: number
  market_price?: number | null
  market_price_updated_at?: string | null
  auction_price_min?: number | null
  auction_price_updated_at?: string | null
}

export type TopPrizeValue = { grade: string; name: string; fresh: { value: number; updatedAt: string } }

// 目当ての賞が何本入っているかは公表されないため、1〜3本の場合を示す。
const ASSUMED_COUNTS = [1, 2, 3]
const TOP_GRADES = ['A賞', 'B賞', 'C賞']
// ラストワン賞の費用の例に使う残り本数
const LAST_ONE_EXAMPLE_REMAINING = 10

const num = { fontVariantNumeric: 'tabular-nums' as const }

// 平均回数の表示。整数ならそのまま、端数があれば小数第1位まで（/calc の formatTimes と同じ）。
function formatDraws(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

// 中古相場は「発売済み」かつ「取得から60日以内」のものだけを事実として扱う。
// 未発売の商品に流通前の価格を当てても意味がないため（過去の方針 cfb0fbe と同じ考え方）。
export function topPrizeValues(prizes: EvPrize[], isReleased: boolean): TopPrizeValue[] {
  if (!isReleased) return []
  return prizes
    .filter(p => TOP_GRADES.includes(p.grade))
    .map(p => ({ grade: p.grade, name: p.name, fresh: freshValue(p) }))
    .filter((p): p is TopPrizeValue => p.fresh != null)
}

// このページのデータ最終更新 = 商品データ・相場データ（全賞対象）のうち最新のタイムスタンプ。
// レンダー時刻ではなく実データの更新日を使う（ADSENSE_SPEC B-3 / revalidate緩和後も虚偽表示にしないため）。
export function pageLastUpdated(kujiUpdatedAt: string | null, prizes: EvPrize[]): string | null {
  const stamps = [
    kujiUpdatedAt,
    ...prizes.map(p => p.market_price_updated_at),
    ...prizes.map(p => p.auction_price_updated_at),
  ].filter((t): t is string => !!t)
  return stamps.length > 0 ? stamps.sort().at(-1)! : null
}

// 1回の価格・総本数・ロット総額と、計算ページへのボタン（折りたたまずに見せる部分）
export function EvSummary({
  kujiId,
  price,
  totalCount,
  assumed,
}: {
  kujiId: number
  price: number
  totalCount: number
  assumed: boolean
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-center">
          <p className="text-[10px] text-stone-400 font-bold mb-1">1回の価格</p>
          <p className="text-base font-black text-stone-800" style={num}>{price.toLocaleString()}円</p>
        </div>
        {/* 実測でない総本数（仮置きの80本）は、事実と誤解されないよう「仮定」と明記する */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-center">
          <p className="text-[10px] text-stone-400 font-bold mb-1">{assumed ? '総本数（仮定）' : '総本数'}</p>
          <p className="text-base font-black text-stone-800" style={num}>{totalCount.toLocaleString()}本</p>
        </div>
        <div className="bg-stone-50 border border-shu-bg rounded-xl p-3 text-center">
          <p className="text-[10px] text-stone-400 font-bold mb-1">{assumed ? 'ロット総額（仮定）' : 'ロット総額'}</p>
          <p className="text-base font-black text-shu" style={num}>{(price * totalCount).toLocaleString()}円</p>
        </div>
      </div>

      <Link
        href={`/calc?kuji_id=${kujiId}`}
        className="flex items-center justify-center gap-2 w-full py-3.5 bg-shu text-white text-sm font-black rounded-xl hover:bg-shu-dark press mb-4"
        style={{ boxShadow: '0 6px 16px rgba(225, 75, 54, 0.35)' }}
      >
        期待値を計算する →
      </Link>
    </>
  )
}

// 平均回数は「総本数」と「目当ての賞の本数」だけで決まり、どの賞かには依存しない。
// 以前は A・B・C賞ごとに同じ数字の表を3つ並べていたため、1つの表にまとめた（2026-11）。
export function AverageDraws({ price, totalCount, assumed }: { price: number; totalCount: number; assumed: boolean }) {
  return (
    <div>
      <p className="text-xs font-bold text-stone-500 mb-2">目当ての賞が出るまでの平均回数</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse" style={num}>
          <thead>
            <tr className="text-stone-400 border-b border-stone-200">
              <th className="text-left font-bold py-1.5 pr-2">目当ての賞の本数（仮定）</th>
              <th className="text-right font-bold py-1.5 pr-2">平均</th>
              <th className="text-right font-bold py-1.5">目安金額</th>
            </tr>
          </thead>
          <tbody>
            {ASSUMED_COUNTS.map(k => {
              const avg = expectedDraws(totalCount, k)
              const cost = Math.round(avg * price)
              return (
                <tr key={k} className="border-b border-stone-100 last:border-0">
                  <td className="py-1.5 pr-2 text-stone-600 whitespace-nowrap">目当ての賞が{k}本入っている場合</td>
                  <td className="py-1.5 pr-2 text-right font-bold text-stone-800 whitespace-nowrap">平均 {formatDraws(avg)}回目</td>
                  <td className="py-1.5 text-right text-stone-500 whitespace-nowrap">約{cost.toLocaleString()}円</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-stone-400 mt-2 leading-relaxed">
        {assumed
          ? `総本数を${totalCount}本と仮定した場合、目当ての賞の本数が同じなら、どの賞でも平均回数は同じです。`
          : `総本数${totalCount}本のくじでは、目当ての賞の本数が同じなら、どの賞でも平均回数は同じです。`}
      </p>
    </div>
  )
}

export function TopMarketPrices({ items }: { items: TopPrizeValue[] }) {
  const sum = items.reduce((s, p) => s + p.fresh.value, 0)
  const latest = items.map(p => p.fresh.updatedAt).sort().at(-1) ?? null
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
      <p className="text-xs font-bold text-stone-500 mb-2">上位賞の中古相場</p>
      <div className="space-y-1.5 mb-2">
        {items.map(p => (
          <div key={p.grade} className="flex items-center justify-between gap-2">
            <span className="text-xs text-stone-600 truncate">【{p.grade}】{p.name}</span>
            <span className="text-xs font-bold text-stone-800 whitespace-nowrap" style={num}>¥{p.fresh.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="flex items-baseline justify-between pt-2 border-t border-stone-200">
        <span className="text-xs font-bold text-stone-500">上位賞合計</span>
        <span className="text-sm font-black text-shu" style={num}>¥{sum.toLocaleString()}</span>
      </div>
      {latest && <p className="text-[10px] text-stone-400 mt-2">取得日：{latest.slice(0, 10)}時点</p>}
    </div>
  )
}

// ラストワン賞は抽選ではなく「最後の1本を引いた人」に渡る。残り2本以上の時点で1回引いて
// 当たる確率は0%なので、確率では表せない（以前の1/残り本数の表示は誤りだった）。
// 確定的に言えるのは「残りを全部自分で引けば確実に取れる＝残り本数×1回の価格」。
// 以前は残り本数ごとの5行の表（価格×80・40・20・10・5）だったが、掛け算を並べただけなので1文にした（2026-11）。
export function LastOneCost({ price }: { price: number }) {
  return (
    <p className="text-xs text-stone-600 leading-relaxed">
      ラストワン賞は最後の1本を引いた人がもらえる賞で、残りを全部引けば確実に取れます（費用＝残り本数×{price.toLocaleString()}円。例：残り{LAST_ONE_EXAMPLE_REMAINING}本なら{(LAST_ONE_EXAMPLE_REMAINING * price).toLocaleString()}円）。
      <Link href="/blog/ichiban-kuji-last-one" className="text-shu hover:underline ml-1">ラストワン賞の狙い方</Link>
    </p>
  )
}
