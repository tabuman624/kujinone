import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { ipSlugFor, IP_NAMES } from '../../lib/ipGroups'
import { freshValue, lastDatedValue, type PriceSource } from '../../lib/priceFreshness'
import { formatPct } from '../../lib/priceTrend'
import { monthLabel } from '../../lib/jst'
import PriceSparkline, { type SparklineSeries } from './PriceSparkline'

// 「このくじのデータ」: DBから決まる事実だけを、数値・短い定型文・小さな表で出す（文章は生成しない）。
// データ取得はページ側でまとめて行い、このコンポーネントは同期描画にする（PriceSparklineのコメント参照）。
// 取得はid順・並べ替えは安定ソートにして、同じデータなら毎回同じHTMLになるようにしている。

const PAGE_SIZE = 1000
const TOP_GRADES = ['A賞', 'B賞', 'C賞', 'ラストワン賞']
const PAST_LIMIT = 5
// 価格cron（app/api/cron/update-prices）が相場を取りに行くのは発売後90日まで。
export const MARKET_TRACKING_DAYS = 90
// 未発売で、発表済みの賞がこの数以下なら「一部のみ発表」とみなす（発売済みの最小構成は5賞＝A〜D賞＋ラストワン賞）。
const PARTIAL_MAX_GRADES = 3

type KujiRow = { id: number; title: string; price: number; release_at: string | null; product_id: string | null }

// Supabase(PostgREST)は1回の応答が最大1000行なので、id順に区切って全件取る。
// 途中で失敗したら null（一部だけのデータで過去弾を出さないため）。
async function fetchAll<T>(table: string, columns: string): Promise<T[] | null> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error || !data) return null
    out.push(...(data as T[]))
    if (data.length < PAGE_SIZE) return out
  }
}

export type PastKuji = {
  id: number
  title: string
  price: number
  release_at: string | null
}

export type KujiData = {
  series: {
    ipName: string
    past: PastKuji[] // 発売日が新しい順
    latest: { id: number; title: string; price: number; release_at: string | null } | null // この弾より後に出た（出る）最新弾
  } | null
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

// 発売日・価格を比べるときの並び順（発売日→id）。発売日が同じでも順序が揺れないようにする。
function releaseKey(k: { release_at: string | null; id: number }): string {
  return `${k.release_at ?? '9999-99-99'}#${String(k.id).padStart(10, '0')}`
}

export async function loadKujiData(
  self: { id: number; price: number; release_at: string | null; product_id: string | null },
): Promise<KujiData> {
  const allKuji = await fetchAll<KujiRow & { is_active: boolean }>('kuji', 'id, title, price, release_at, product_id, is_active')
  if (!allKuji) return { series: null }
  const kujiList = allKuji.filter(k => k.is_active)
  if (kujiList.length === 0) return { series: null }

  // ── 同じシリーズの過去弾 ──
  let series: KujiData['series'] = null
  const slug = self.product_id ? ipSlugFor(self.product_id) : null
  const ipName = slug ? IP_NAMES[slug] : null
  if (slug && ipName) {
    const selfKey = releaseKey(self)
    const sameIp = kujiList
      .filter(k => k.id !== self.id && k.product_id && ipSlugFor(k.product_id) === slug)
      .sort((a, b) => releaseKey(b).localeCompare(releaseKey(a)))
    const pastRows = sameIp.filter(k => releaseKey(k) < selfKey).slice(0, PAST_LIMIT)
    const newer = sameIp.filter(k => releaseKey(k) > selfKey)

    // 過去弾のA賞の相場は、取得ミスらしい値が混ざるため出さない（発売月・価格・リンクのみ）。
    const past = pastRows.map(k => ({
      id: k.id, title: k.title, price: k.price, release_at: k.release_at,
    }))
    const latestRow = newer[0] ?? null
    if (past.length > 0 || latestRow) {
      series = {
        ipName,
        past,
        latest: latestRow ? { id: latestRow.id, title: latestRow.title, price: latestRow.price, release_at: latestRow.release_at } : null,
      }
    }
  }

  return { series }
}

// 未発売で、発表済みの賞が一部だけと判断できるか。
// 発売済みのくじの最小構成は5賞（ちょこっとシリーズのA〜D賞＋ラストワン賞）なので、
// 4〜5賞の段階では「一部だけ」と言い切れない。3賞以下か、A賞〜の連番が途中で抜けているときだけそうみなす。
export function isPartialLineup(grades: string[]): boolean {
  const uniq = [...new Set(grades)]
  if (uniq.length === 0) return false
  if (uniq.length <= PARTIAL_MAX_GRADES) return true
  const letters = uniq
    .map(g => /^([A-Z])賞$/.exec(g)?.[1])
    .filter((l): l is string => !!l)
    .map(l => l.charCodeAt(0) - 65)
    .sort((a, b) => a - b)
  return letters.length > 0 && letters.some((n, i) => n !== i)
}

function ymLabel(date: string | null): string {
  return date ? monthLabel(date.slice(0, 7)) : '発売日未定'
}

type OwnPrize = { grade: string; name: string } & PriceSource

export default function KujiDataSection({
  data,
  prizes,
  price,
  releaseAt,
  isReleased,
  today,
  sparklineSeries,
}: {
  data: KujiData
  prizes: OwnPrize[]
  price: number
  releaseAt: string | null
  isReleased: boolean
  today: string
  sparklineSeries: SparklineSeries[]
}) {
  const grades = [...new Set(prizes.map(p => p.grade))]
  const partial = !isReleased && isPartialLineup(grades)
  const daysSinceRelease = isReleased && releaseAt ? daysBetween(releaseAt, today) : null
  const trackingEnded = daysSinceRelease != null && daysSinceRelease > MARKET_TRACKING_DAYS

  // 5. 自動更新が終わった古いくじの「最後に取れた相場」。新しい値（freshValue）が出ている賞は上位賞の相場欄に任せる。
  const anyFresh = isReleased && prizes.some(p => freshValue(p) != null)
  const lastValues = trackingEnded
    ? [...prizes]
        .filter(p => TOP_GRADES.includes(p.grade) && freshValue(p) == null)
        .sort((a, b) => TOP_GRADES.indexOf(a.grade) - TOP_GRADES.indexOf(b.grade))
        .map(p => ({ grade: p.grade, name: p.name, last: lastDatedValue(p) }))
        .filter((p): p is { grade: string; name: string; last: { value: number; updatedAt: string } } => p.last != null)
    : []
  // 6b. 古いくじで、相場を何も示せないもの
  const noMarketAtAll = trackingEnded && !anyFresh && lastValues.length === 0

  const { series } = data
  const prev = series?.past[0] ?? null

  const hasAnything = partial || noMarketAtAll || series || sparklineSeries.length > 0 || lastValues.length > 0
  if (!hasAnything) return null

  const sub = 'text-xs font-bold text-stone-500 mb-2'
  const box = 'bg-stone-50 border border-stone-200 rounded-xl'
  const num = { fontVariantNumeric: 'tabular-nums' as const }

  return (
    <div className="mb-6 anim-fade-up">
      <h2 className="text-xs font-black text-stone-400 tracking-wider mb-3">このくじのデータ / DATA</h2>
      <div className="space-y-5">
        {(partial || noMarketAtAll) && (
          <div className={`${box} px-4 py-3 text-xs text-stone-600 leading-relaxed space-y-1`}>
            {partial && <p>現在発表されているのは{grades.join('・')}です。残りの賞は公式発表後に自動で追加されます。</p>}
            {noMarketAtAll && <p>相場の自動取得は発売後{MARKET_TRACKING_DAYS}日までです。</p>}
          </div>
        )}

        {series && (
          <div>
            <p className={sub}>{series.ipName}の過去弾</p>
            {prev && (
              <p className="text-xs text-stone-600 mb-2" style={num}>
                {prev.price === price
                  ? `前の弾（${ymLabel(prev.release_at)}）と同じ1回${price.toLocaleString()}円です。`
                  : `前の弾（${ymLabel(prev.release_at)}）は${prev.price.toLocaleString()}円 → 今回${price.toLocaleString()}円（${price > prev.price ? '+' : '−'}${Math.abs(price - prev.price).toLocaleString()}円）`}
              </p>
            )}
            {series.past.length > 0 && (
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                {series.past.map((k, i) => (
                  <Link
                    key={k.id}
                    href={`/kuji/${k.id}`}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 press hover:bg-stone-50 transition-colors ${i !== series.past.length - 1 ? 'border-b border-stone-100' : ''}`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-800 truncate">{k.title}</p>
                      <p className="text-[11px] text-stone-500 mt-0.5" style={num}>
                        {ymLabel(k.release_at)}発売・{k.price.toLocaleString()}円/回
                      </p>
                    </div>
                    <span className="text-shu text-sm flex-shrink-0">→</span>
                  </Link>
                ))}
              </div>
            )}
            {series.latest && (
              <p className="text-xs text-stone-600 mt-2" style={num}>
                このシリーズの最新弾：
                <Link href={`/kuji/${series.latest.id}`} className="text-shu hover:underline">{series.latest.title}</Link>
                （{series.latest.release_at ? `${ymLabel(series.latest.release_at)}${series.latest.release_at > today ? '発売予定' : '発売'}` : '発売日未定'}・{series.latest.price.toLocaleString()}円/回）
              </p>
            )}
          </div>
        )}

        {sparklineSeries.length > 0 && (
          <div>
            <p className={sub}>発売後の落札相場の変化</p>
            <PriceSparkline series={sparklineSeries} />
          </div>
        )}

        {lastValues.length > 0 && (
          <div>
            <p className={sub}>最後に取得できた相場</p>
            <div className={`${box} p-3 space-y-1.5`}>
              {lastValues.map(p => (
                <div key={p.grade} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-stone-600 truncate">【{p.grade}】{p.name}</span>
                  <span className="text-xs text-stone-800 whitespace-nowrap" style={num}>
                    <span className="text-[10px] text-stone-400 mr-1.5">最終取得 {p.last.updatedAt.slice(0, 10)} 時点</span>
                    <span className="font-bold">¥{p.last.value.toLocaleString()}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 mt-1.5">発売から{MARKET_TRACKING_DAYS}日を過ぎたため、相場の自動更新は終了しています。期待値の計算には使っていません。</p>
          </div>
        )}
      </div>
    </div>
  )
}

// MARKET段落用：このくじの上位賞で、頑健な変化率が出せたもの
export function robustTrendSummary(series: SparklineSeries[]): string | null {
  const ok = series.filter(s => s.trend.status === 'ok')
  if (ok.length === 0) return null
  const parts = ok.map(s => (s.trend.status === 'ok' ? `${s.grade}${formatPct(s.trend.trend.pct)}` : ''))
  const froms = ok.map(s => (s.trend.status === 'ok' ? s.trend.trend.from : '')).sort()
  const tos = ok.map(s => (s.trend.status === 'ok' ? s.trend.trend.to : '')).sort()
  return `このくじの上位賞の落札相場は、${froms[0]}〜${tos[tos.length - 1]}の記録で発売後最初の3日分と直近3日分の中央値を比べると${parts.join('・')}`
}
