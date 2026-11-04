import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { lowerFreshValue } from '../../lib/priceFreshness'
import { jaMonthDay } from '../../lib/jst'

// ラストワン賞の記事（ichiban-kuji-last-one）の下に出す「発売中の商品」の表。
//
// 以前は全商品で「残り10本なら〇円」（価格×10）という同じ計算を並べていたため、商品ごとの情報が無かった。
// 今はくじページの LastOneCost と同じ考え方で、ラストワン賞の相場（販売価格と落札価格の低い方、lowerFreshValue）と、
// 「残りを全部引く費用がその相場以下になる残り本数」（相場÷1回の価格の切り捨て）を出す（2026-11）。
// 引くべきかどうかは書かない。総本数は公表されないため、本数の上限には仮定の値（total_count）を使う。
//
// データの取得はページ側（loadLatestKujiRows）で行い、この部品は同期にする
// （非同期のサーバー部品を増やさない方針。2026-10 の ISR Writes 対策）。

const WINDOW_DAYS = 30
const MAX_ROWS = 8
// 相場が取れた商品が1件も無いときだけ使う、残り本数の例
const FALLBACK_REMAINING = 10

const num = { fontVariantNumeric: 'tabular-nums' as const }

export type LatestKujiRow = {
  id: number
  title: string
  price: number
  totalCount: number
  lastOne: { value: number; updatedAt: string; source: 'market' | 'auction' } | null
}

export async function loadLatestKujiRows(): Promise<LatestKujiRow[]> {
  // 発売済みの判定はくじページと同じUTCの日付
  const today = new Date().toISOString().slice(0, 10)
  const windowStartDate = new Date()
  windowStartDate.setDate(windowStartDate.getDate() - WINDOW_DAYS)
  const windowStart = windowStartDate.toISOString().slice(0, 10)

  const { data: kujiList } = await supabase
    .from('kuji')
    .select('id, title, price, total_count')
    .gte('release_at', windowStart)
    .lte('release_at', today)
    .order('release_at', { ascending: false })
    .order('id', { ascending: false })
  if (!kujiList || kujiList.length === 0) return []

  const { data: lastOnePrizes } = await supabase
    .from('prizes')
    .select('kuji_id, market_price, market_price_updated_at, auction_price_min, auction_price_updated_at')
    .in('kuji_id', kujiList.map(k => k.id))
    .eq('grade', 'ラストワン賞')
  const lastOneByKuji = new Map((lastOnePrizes ?? []).map(p => [p.kuji_id as number, p]))

  return kujiList
    .filter(k => lastOneByKuji.has(k.id) && k.total_count > 0)
    .map(k => ({
      id: k.id,
      title: k.title,
      price: k.price,
      totalCount: k.total_count,
      lastOne: lowerFreshValue(lastOneByKuji.get(k.id)!),
    }))
}

function RowLink({ id, children }: { id: number; children: React.ReactNode }) {
  return (
    <Link
      href={`/kuji/${id}`}
      className="flex items-center justify-between gap-3 p-3 border border-stone-200 rounded-xl press hover:border-shu transition-colors"
    >
      <div className="min-w-0">{children}</div>
      <span className="text-shu text-sm flex-shrink-0">→</span>
    </Link>
  )
}

export default function LatestKujiTable({ rows }: { rows: LatestKujiRow[] }) {
  const priced = rows.filter(r => r.lastOne).slice(0, MAX_ROWS)

  if (priced.length === 0) {
    const examples = rows.slice(0, 3)
    if (examples.length === 0) return null
    return (
      <div className="px-5 pb-6">
        <h2 className="text-base font-black text-stone-800 mb-3">実際の商品で計算する</h2>
        <p className="text-sm text-stone-600 mb-3 leading-relaxed">
          現在発売中の商品で、残り{FALLBACK_REMAINING}本の時点からラストワン賞を確実に取る（残りを全部引く）場合の費用です。
        </p>
        <div className="space-y-2">
          {examples.map(k => (
            <RowLink key={k.id} id={k.id}>
              <p className="text-sm font-bold text-stone-800 truncate">{k.title}</p>
              <p className="text-xs text-stone-500 mt-0.5" style={num}>
                残り{FALLBACK_REMAINING}本なら{(FALLBACK_REMAINING * k.price).toLocaleString()}円（1回{k.price.toLocaleString()}円×{FALLBACK_REMAINING}回）
              </p>
            </RowLink>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 pb-6">
      <h2 className="text-base font-black text-stone-800 mb-3">発売中の商品で見る、ラストワン賞の相場と残り本数</h2>
      <p className="text-sm text-stone-600 mb-3 leading-relaxed">
        発売から{WINDOW_DAYS}日以内の商品について、ラストワン賞の中古相場と、残りを全部引く費用（残り本数×1回の価格）がその相場以下になる残り本数を出しています。相場は毎日更新しています。
      </p>
      <div className="space-y-2">
        {priced.map(k => {
          const lo = k.lastOne!
          const breakEven = Math.floor(lo.value / k.price)
          return (
            <RowLink key={k.id} id={k.id}>
              <p className="text-sm font-bold text-stone-800 truncate">{k.title}</p>
              <p className="text-xs text-stone-500 mt-0.5" style={num}>
                1回{k.price.toLocaleString()}円・ラストワン賞の{lo.source === 'auction' ? '落札相場' : '中古相場'} 約¥{lo.value.toLocaleString()}（{jaMonthDay(lo.updatedAt)}時点）
              </p>
              <p className="text-xs text-stone-700 mt-0.5" style={num}>
                {breakEven < 1
                  ? '相場が1回の価格より低い'
                  : breakEven === 1
                    ? '残りを全部引く費用が相場以下になるのは、最後の1本のときだけ'
                    : breakEven < k.totalCount
                      ? <>残りを全部引く費用が相場以下になるのは、<strong className="text-stone-800">残り{breakEven}本</strong>（{(breakEven * k.price).toLocaleString()}円）以下のとき</>
                      : null}
              </p>
            </RowLink>
          )
        })}
      </div>
      <p className="text-[11px] text-stone-400 mt-2 leading-relaxed">
        相場は、販売価格（Yahoo!ショッピング）と落札価格（ヤフオクの中央値）の両方があるときは低い方を使っています。店頭の残り本数と見比べるときの目安です。
      </p>
    </div>
  )
}
