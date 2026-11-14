import Link from 'next/link'
import AffiliateLink from '../../components/AffiliateLink'
import { supabase } from '../../lib/supabase'
import { freshValue, type PriceSource } from '../../lib/priceFreshness'
import { shortDate } from '../../lib/jst'
import { resaleBaseTitle } from '../../lib/resale'

// 発売後のくじページの上の方に出す、相場のまとめ（2026-11）。
// アフィリエイトのクリックの7割は発売後の人気くじのページからなのに、ボタンのある「相場を確認・購入する」欄は
// ページのかなり下（本文の約85%の位置）にあった。相場を探して来た人がすぐ答えを見られるよう、先に出す。
// 出すのは賞一覧の上から3つとラストワン賞。hololive のように賞の名前が「A賞」でないくじもあるため、名前ではなく並び順で選ぶ。
// 数字は賞一覧と同じ値（freshValue：取得から60日以内）。相場が無い賞は行ごと出さない。発売前と、相場が1つも無いくじには出さない。
// 相場には必ず取得日を添える（古い値を今の相場と誤解させないため）。説明の文は置かず、見出しの横に日付だけ出す。
// 下の「相場を確認・購入する」欄はそのまま残す。こちらのメルカリのボタンは eventLabel で区別して効果を測る。
//
// 再販売のくじは、発売前に「初回販売の相場」として元のくじの相場を同じ形で出す（2026-11、ポケモン30周年の再販売に向けて）。
// 再販売の賞は初回と同じ品物なので、いま中古で出回っているのは初回販売の分。発売後は、そのくじ自身の相場のまとめに切り替わる。
// 元のくじは発売から90日を過ぎると相場の自動更新が止まるため、update-prices の④で発売が近い再販売の元のくじを取り直している。

const LAST_ONE = 'ラストワン賞'
const NOT_TOP = [LAST_ONE, 'その他']
const TOP_COUNT = 3

const num = { fontVariantNumeric: 'tabular-nums' as const }

type Prize = PriceSource & { grade: string; name: string }

export type FirstSale = { id: number; release_at: string; prizes: Prize[] }

// 発売前の再販売のくじについて、元のくじと賞の相場を読む。page.tsx の Promise.all から呼ぶ
// （子コンポーネントで await すると ISR の出力順が揺れるため、データはページでまとめて取る）。
export async function loadFirstSale(kuji: { id: number; title: string; release_at: string | null }): Promise<FirstSale | null> {
  const base = resaleBaseTitle(kuji.title)
  if (!base || !kuji.release_at) return null
  const { data: originals } = await supabase
    .from('kuji')
    .select('id, release_at')
    .eq('title', base)
    .lt('release_at', kuji.release_at)
    .order('release_at', { ascending: false })
    .limit(1)
  const original = originals?.[0]
  if (!original?.release_at) return null
  const { data: prizes } = await supabase
    .from('prizes')
    .select('grade, name, market_price, market_price_updated_at, auction_price_min, auction_price_updated_at')
    .eq('kuji_id', original.id)
    .order('sort_order', { ascending: true })
  return { id: original.id, release_at: original.release_at, prizes: prizes ?? [] }
}

export default function MarketSummary({
  prizes,
  mercariHref,
  eventLabel,
  heading = '相場のまとめ / PRICE',
  source,
}: {
  prizes: Prize[] // 賞一覧と同じ並び（sort_order 順）
  mercariHref: string
  eventLabel: string
  heading?: string
  source?: { href: string; label: string } // 相場の出どころのくじ（初回販売の相場のとき）
}) {
  const top = prizes.filter(p => !NOT_TOP.includes(p.grade)).slice(0, TOP_COUNT)
  const lastOne = prizes.find(p => p.grade === LAST_ONE)
  const items = [...top, ...(lastOne ? [lastOne] : [])]
    .map(p => ({ grade: p.grade, name: p.name, fresh: freshValue(p) }))
    .filter((p): p is { grade: string; name: string; fresh: { value: number; updatedAt: string } } => p.fresh != null)
  if (items.length === 0) return null

  const latest = items.map(p => p.fresh.updatedAt).sort().at(-1)!

  return (
    <div className="mb-6 anim-fade-up" style={{ animationDelay: '100ms' }}>
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h2 className="text-xs font-black text-stone-400 tracking-wider">{heading}</h2>
        <span className="text-[11px] text-stone-400" style={num}>{shortDate(latest)}時点</span>
      </div>
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
        <div className="space-y-1.5">
          {items.map((p, i) => (
            <div key={`${p.grade}-${i}`} className="flex items-center justify-between gap-2">
              <span className="text-xs text-stone-600 truncate">【{p.grade}】{p.name}</span>
              <span className="text-sm font-bold text-stone-800 whitespace-nowrap" style={num}>約¥{p.fresh.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
        {source && (
          <Link href={source.href} className="inline-block mt-2 text-xs text-shu hover:underline">{source.label}</Link>
        )}
        <AffiliateLink
          href={mercariHref}
          rel="noopener noreferrer sponsored nofollow"
          className="mt-3 flex items-center gap-3 p-3 border rounded-xl bg-shu-bg border-shu text-shu press"
          label="メルカリで出品価格を見る【PR】"
          eventLabel={eventLabel}
        />
      </div>
    </div>
  )
}
