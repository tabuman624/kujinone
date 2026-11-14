import AffiliateLink from '../../components/AffiliateLink'
import { freshValue, type PriceSource } from '../../lib/priceFreshness'
import { formatPct } from '../../lib/priceTrend'
import { jaMonthDay } from '../../lib/jst'
import type { SparklineSeries } from './PriceSparkline'

// 発売後のくじページの上の方に出す、相場のまとめ（2026-11）。
// アフィリエイトのクリックの7割は発売後の人気くじのページからなのに、ボタンのある「相場を確認・購入する」欄は
// ページのかなり下（本文の約85%の位置）にあった。相場を探して来た人がすぐ答えを見られるよう、先に出す。
// 数字は賞一覧・検索結果の説明文と同じ値（freshValue：取得から60日以内）。発売前と、相場が1つも無いくじには出さない。
// 下の「相場を確認・購入する」欄はそのまま残す。こちらのメルカリのボタンは eventLabel で区別して効果を測る。

const GRADES = ['A賞', 'B賞', 'C賞', 'ラストワン賞']

const num = { fontVariantNumeric: 'tabular-nums' as const }

type Prize = PriceSource & { grade: string; name: string }

export default function MarketSummary({
  prizes,
  price,
  isReleased,
  sparklineSeries,
  mercariHref,
  eventLabel,
}: {
  prizes: Prize[]
  price: number
  isReleased: boolean
  sparklineSeries: SparklineSeries[]
  mercariHref: string
  eventLabel: string
}) {
  if (!isReleased) return null

  const items = prizes
    .filter(p => GRADES.includes(p.grade))
    .map(p => ({ grade: p.grade, name: p.name, fresh: freshValue(p) }))
    .filter((p): p is { grade: string; name: string; fresh: { value: number; updatedAt: string } } => p.fresh != null)
    .sort((a, b) => GRADES.indexOf(a.grade) - GRADES.indexOf(b.grade))
  if (items.length === 0) return null

  const latest = items.map(p => p.fresh.updatedAt).sort().at(-1)!
  // 発売直後と直近の落札相場の変化。ページ下のグラフと同じ計算で、出せた賞だけ並べる
  const trends = sparklineSeries.flatMap(s => (s.trend.status === 'ok' ? [`${s.grade}${formatPct(s.trend.trend.pct)}`] : []))

  return (
    <div className="mb-6 anim-fade-up" style={{ animationDelay: '100ms' }}>
      <h2 className="text-xs font-black text-stone-400 tracking-wider mb-3">相場のまとめ / PRICE</h2>
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
        <div className="space-y-1.5">
          {items.map((p, i) => (
            <div key={`${p.grade}-${i}`} className="flex items-center justify-between gap-2">
              <span className="text-xs text-stone-600 truncate">【{p.grade}】{p.name}</span>
              <span className="text-sm font-bold text-stone-800 whitespace-nowrap" style={num}>約¥{p.fresh.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-stone-500 leading-relaxed mt-3 pt-2 border-t border-stone-200" style={num}>
          {jaMonthDay(latest)}時点の、ヤフオクとYahoo!ショッピングの価格です。1回の価格は{price.toLocaleString()}円。
          {trends.length > 0 && <>発売後の落札相場の変化は{trends.join('・')}（グラフはページ下の「このくじのデータ」）。</>}
        </p>
        <AffiliateLink
          href={mercariHref}
          rel="noopener noreferrer sponsored nofollow"
          className="mt-3 flex items-center gap-3 p-3 border rounded-xl bg-shu-bg border-shu text-shu press"
          label="メルカリで出品価格を見る【PR】"
          sub="いま出品されている価格を確認"
          eventLabel={eventLabel}
        />
      </div>
    </div>
  )
}
