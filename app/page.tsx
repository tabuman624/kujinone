import { shortDate, todayJst, weekdayLabel, weekdayOf } from './lib/jst'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { supabase } from './lib/supabase'
import { OG_BASE, OG_IMAGE } from './lib/siteMeta'
import { freshValue, type PriceSource } from './lib/priceFreshness'
import { storeLabels } from './schedule/stores'
import RelDays from './schedule/RelDays'

// Vercelは再生成のたびに（内容が同じでも）ISR Writeを計上するため、再生成は1日1回に抑える。
// 日付の切り替わり後の更新は /api/cron/revalidate-changed（毎日0時台）が行う。
export const revalidate = 86400

export const metadata: Metadata = {
  title: '一番くじ 期待値計算ツール | くじのね',
  description: '一番くじ（いちばんくじ・1番くじ）の期待値を無料で計算。目当ての賞が当たるまでの平均費用を秒で算出。発売スケジュール・ヤフオク落札相場も確認できます。',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'くじのね | 一番くじ期待値計算',
    description: '一番くじの期待値を無料で計算。狙う賞を選ぶだけ、登録不要です。',
    url: 'https://kujinone.com',
    ...OG_BASE,
    images: [OG_IMAGE],
  },
}

// トップページ（2026-11-15 作り直し）。
// 開いてすぐ今週の発売が見えるよう、見出しを小さくして「今週発売の一番くじ」を一番上に置く。
// 3つの欄は期間が重ならない：今週の発売＝明日から7日／いま注目＝その先／発売中の相場＝今日まで（発売から2週間）。
// 以前の PICKUP（人気3件の横スライド）と「発売中のくじ」の一覧は同じくじが2回出ていたので、「発売中のくじの相場」1つにまとめた。
// ページのタイトル・h1・説明文は検索への影響を避けるため変えていない。
// 閲覧数やチェックの回数は並び順を決めるのに使うだけで、数字そのものはページに出さない。
// データの読み込みに失敗しても止めず、その欄を出さない（ビルドを落とさないため。/ip・/store と同じ）。

const WEEK_DAYS = 7 // 今週の発売：明日から7日
const FALLBACK_COUNT = 3 // 今週の発売が無い週は、次の発売を3件出す
const ON_SALE_DAYS = 14 // 発売中：発売から2週間（今日を含む）
const ON_SALE_COUNT = 5
const PRIZES_PER_KUJI = 2
const TREND_COUNT = 3
const TREND_MIN_VIEWS = 10 // 注目：この7日間に10回以上見られたくじだけ

type UpcomingKuji = {
  id: number
  title: string
  price: number
  release_at: string
  image_url: string | null
  banner_url: string | null
  available_stores: string[] | null
}
type OnSaleKuji = { id: number; title: string; release_at: string; image_url: string | null; banner_url: string | null }
type PrizeRow = PriceSource & {
  id: number
  kuji_id: number
  grade: string
  name: string
  image_url: string | null
  sort_order: number | null
}
type Snapshot = { kuji_id: number; view_count: number; recorded_at: string }

function addDays(date: string, n: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
}

// 欄の見出しに「一番くじ」とあるので、くじ名の頭の「一番くじ」は省く
function shortTitle(title: string) {
  return title.replace(/^一番くじ\s*/, '')
}

function weekdayClass(date: string) {
  const wd = weekdayOf(date)
  return wd === 0 ? 'text-rose-500' : wd === 6 ? 'text-sky-600' : 'text-stone-500'
}

function storeText(stores: string[] | null) {
  const labels = storeLabels(Array.isArray(stores) ? stores : [])
  if (labels.length === 0) return ''
  return labels.slice(0, 3).join('・') + (labels.length > 3 ? ' ほか' : '')
}

function fmtPostDate(d: string) {
  const dt = new Date(d)
  return `${dt.getMonth() + 1}月${dt.getDate()}日`
}

// kuji_views_daily（毎日22時の累計の記録）を読む。PostgRESTは1回1,000行までなので .range で続きを取る
async function loadSnapshots(kujiIds: number[], from: string): Promise<Snapshot[]> {
  const rows: Snapshot[] = []
  if (kujiIds.length === 0) return rows
  for (let page = 0; page < 10; page++) {
    const { data } = await supabase
      .from('kuji_views_daily')
      .select('kuji_id, view_count, recorded_at')
      .in('kuji_id', kujiIds)
      .gte('recorded_at', from)
      .order('recorded_at', { ascending: true })
      .order('kuji_id', { ascending: true })
      .range(page * 1000, page * 1000 + 999)
    if (!data || data.length === 0) break
    rows.push(...(data as Snapshot[]))
    if (data.length < 1000) break
  }
  return rows
}

// この7日間に見られた回数＝最新の記録 − その7日前の記録。7日前の記録が無い新しいくじは、最初の記録との差
function weeklyViews(rows: Snapshot[]): Map<number, number> {
  const latest = rows.reduce((m, r) => (r.recorded_at > m ? r.recorded_at : m), '')
  const result = new Map<number, number>()
  if (!latest) return result
  const baseDate = addDays(latest.slice(0, 10), -7)
  const base = new Map<number, number>()
  const last = new Map<number, number>()
  for (const r of rows) {
    // rows は記録日の昇順。baseDate 以前の記録で上書きしていくので、最後に残るのは baseDate 当日（無ければ直前）の値
    if (!base.has(r.kuji_id) || r.recorded_at.slice(0, 10) <= baseDate) base.set(r.kuji_id, r.view_count)
    last.set(r.kuji_id, r.view_count)
  }
  for (const [id, v] of last) result.set(id, v - (base.get(id) ?? v))
  return result
}

async function loadPrizes(kujiIds: number[]): Promise<PrizeRow[]> {
  if (kujiIds.length === 0) return []
  const { data } = await supabase
    .from('prizes')
    .select('id, kuji_id, grade, name, image_url, sort_order, market_price, market_price_updated_at, auction_price_min, auction_price_updated_at')
    .in('kuji_id', kujiIds)
  return (data ?? []) as PrizeRow[]
}

// 賞ごとの人気（期待値の計算で賞にチェックした回数＋くじページで賞の画像を開いた回数。1人1日1回）。ランキングの「人気の賞」と同じ数字
async function loadInterest(prizeIds: number[]): Promise<Map<number, number>> {
  if (prizeIds.length === 0) return new Map()
  const { data } = await supabase.from('prize_interest').select('prize_id, check_count').in('prize_id', prizeIds)
  return new Map((data ?? []).map(r => [r.prize_id as number, r.check_count as number]))
}

export default async function Home() {
  const today = todayJst()
  const weekEnd = addDays(today, WEEK_DAYS)
  const onSaleFrom = addDays(today, -(ON_SALE_DAYS - 1))

  const [{ data: upcomingData }, { data: onSaleData }] = await Promise.all([
    supabase
      .from('kuji')
      .select('id, title, price, release_at, image_url, banner_url, available_stores')
      .eq('is_active', true)
      .gt('release_at', today)
      .order('release_at', { ascending: true })
      .order('id', { ascending: true }),
    supabase
      .from('kuji')
      .select('id, title, release_at, image_url, banner_url')
      .eq('is_active', true)
      .gte('release_at', onSaleFrom)
      .lte('release_at', today),
  ])
  const upcoming = (upcomingData ?? []) as UpcomingKuji[]
  const onSale = (onSaleData ?? []) as OnSaleKuji[]

  // 今週の発売（明日から7日）。無い週は次の発売を3件
  const thisWeek = upcoming.filter(k => k.release_at <= weekEnd)
  const weekList = thisWeek.length > 0 ? thisWeek : upcoming.slice(0, FALLBACK_COUNT)
  const weekIds = new Set(weekList.map(k => k.id))
  const laterKuji = upcoming.filter(k => !weekIds.has(k.id))

  const [snapshots, prizes] = await Promise.all([
    loadSnapshots([...laterKuji, ...onSale].map(k => k.id), addDays(today, -9)),
    loadPrizes(onSale.map(k => k.id)),
  ])
  const interest = await loadInterest(prizes.map(p => p.id))
  const views = weeklyViews(snapshots)

  // 発売中のくじの相場：発売から2週間のくじを、この7日間によく見られている順に5件。
  // 賞は人気の順に2つ（同じ回数なら相場が高い方、それも同じなら賞一覧の順）。相場は賞一覧・相場のまとめと同じ freshValue
  const prizesByKuji = new Map<number, PrizeRow[]>()
  for (const p of prizes) prizesByKuji.set(p.kuji_id, [...(prizesByKuji.get(p.kuji_id) ?? []), p])
  const onSaleItems = onSale
    .filter(k => (prizesByKuji.get(k.id)?.length ?? 0) > 0)
    .sort((a, b) => (views.get(b.id) ?? 0) - (views.get(a.id) ?? 0) || b.release_at.localeCompare(a.release_at) || a.id - b.id)
    .slice(0, ON_SALE_COUNT)
    .map(k => ({
      ...k,
      prizes: (prizesByKuji.get(k.id) ?? [])
        .map(p => ({ p, checks: interest.get(p.id) ?? 0, fresh: freshValue(p) }))
        .sort((a, b) =>
          b.checks - a.checks ||
          (b.fresh?.value ?? -1) - (a.fresh?.value ?? -1) ||
          (a.p.sort_order ?? 0) - (b.p.sort_order ?? 0) ||
          a.p.id - b.p.id)
        .slice(0, PRIZES_PER_KUJI)
        .map(({ p, fresh }) => ({ id: p.id, grade: p.grade, name: p.name, image_url: p.image_url, value: fresh?.value ?? null, updatedAt: fresh?.updatedAt ?? null })),
    }))
  const priceAsOf = onSaleItems
    .flatMap(k => k.prizes.map(p => p.updatedAt))
    .filter((d): d is string => d != null)
    .sort()
    .at(-1)

  // いま注目されている発売予定：今週の欄より先の発売で、この7日間に10回以上見られたくじを多い順に3件
  const trend = laterKuji
    .map(k => ({ k, v: views.get(k.id) ?? 0 }))
    .filter(x => x.v >= TREND_MIN_VIEWS)
    .sort((a, b) => b.v - a.v || a.k.release_at.localeCompare(b.k.release_at) || a.k.id - b.k.id)
    .slice(0, TREND_COUNT)
    .map(x => x.k)

  const postsDir = path.join(process.cwd(), 'posts')
  // 「一番くじとは」の記事は下の箱からリンクしているので、コラムには入れない（同じ記事が2回出ないように）
  const featuredSlugs = ['kitaichi-toha', 'ichiban-kuji-probability', 'ichiban-kuji-last-one', 'kuji-vs-mercari']
  const featuredPosts = featuredSlugs.map(slug => {
    const raw = fs.readFileSync(path.join(postsDir, `${slug}.md`), 'utf-8')
    const { data } = matter(raw)
    return { slug, title: String(data.title || ''), date: String(data.date || ''), summary: String(data.summary || '') }
  })

  return (
    <main>
      {/* Organization/WebSiteの構造化データはapp/layout.tsxで全ページ共通出力している。
          旧SearchActionはサイト内検索機能が存在せずurlTemplateも無効だったため削除済み。 */}
      {/* 見出し。予定表へのボタンは下のメニューと今週の欄にあるので置かない。計算のボタンは「確率 計算」などで来た人のために残す */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <img src="/logo-mark.svg" alt="" width={40} height={40} className="flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-[17px] font-semibold leading-[1.4] text-stone-800">期待値でねらう、一番くじ</h1>
            <p className="text-xs text-stone-500 leading-[1.6] mt-0.5">
              商品を選ぶだけで、1回あたりの損得と<br />損益ラインがわかります。
            </p>
          </div>
        </div>
        <Link
          href="/calc"
          className="block bg-shu text-white text-[15px] font-semibold text-center py-3 rounded-[10px] mt-3.5 press hover:bg-shu-dark transition-colors"
        >
          期待値を計算する
        </Link>
      </div>

      {/* 今週発売の一番くじ */}
      {weekList.length > 0 && (
        <section className="px-5 pt-2 pb-5">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h2 className="text-base font-black text-stone-800">{thisWeek.length > 0 ? '今週発売の一番くじ' : '次に発売の一番くじ'}</h2>
            <Link href="/schedule" className="text-xs font-bold text-shu-dark hover:underline py-1.5">スケジュール →</Link>
          </div>
          <div>
            {weekList.map(k => {
              const img = k.banner_url || k.image_url
              const stores = storeText(k.available_stores)
              return (
                <Link key={k.id} href={`/kuji/${k.id}`} className="flex items-center gap-2.5 py-2.5 border-t border-stone-100 press group">
                  <div className="w-10 flex-shrink-0 text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <p className="text-[13px] font-extrabold text-stone-800">{shortDate(k.release_at)}</p>
                    <p className={`text-[11px] font-bold ${weekdayClass(k.release_at)}`}>{weekdayLabel(k.release_at)}</p>
                  </div>
                  <div className="w-16 h-9 flex-shrink-0 rounded-md overflow-hidden bg-stone-100">
                    {img && <Image src={img} alt="" width={128} height={72} className="w-full h-full object-cover" unoptimized />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold leading-[1.35] text-stone-800 line-clamp-2 group-hover:text-shu transition-colors">{shortTitle(k.title)}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5 truncate">
                      {k.price.toLocaleString()}円{stores && ` ・ ${stores}`}
                    </p>
                  </div>
                  <RelDays date={k.release_at} variant="pill" />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* 発売中のくじの相場（A案：くじの画像を右の賞2つと同じ高さ 86px にそろえる） */}
      {onSaleItems.length > 0 && (
        <section className="px-5 py-5 border-t-8 border-stone-100">
          <div className="flex items-end justify-between gap-2 mb-1.5">
            <div>
              <h2 className="text-base font-black text-stone-800">発売中のくじの相場</h2>
              <p className="text-[11px] font-bold text-stone-500 mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
                人気の賞{priceAsOf && `・${shortDate(priceAsOf)}時点`}
              </p>
            </div>
            <Link href="/schedule/archive" className="text-xs font-bold text-shu-dark hover:underline py-1.5">発売済み一覧 →</Link>
          </div>
          <div>
            {onSaleItems.map(k => {
              const img = k.banner_url || k.image_url
              return (
                <Link key={k.id} href={`/kuji/${k.id}`} className="block py-3 border-t border-stone-100 press group">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="flex-1 min-w-0 text-[13px] font-bold text-stone-800 truncate group-hover:text-shu transition-colors">{shortTitle(k.title)}</p>
                    <p className="flex-shrink-0 text-[11px] text-stone-500" style={{ fontVariantNumeric: 'tabular-nums' }}>{shortDate(k.release_at)}発売</p>
                  </div>
                  <div className="flex items-start gap-3 mt-2">
                    <div className="w-[153px] h-[86px] flex-shrink-0 rounded-md overflow-hidden bg-stone-100">
                      {img && <Image src={img} alt="" width={306} height={172} className="w-full h-full object-cover" unoptimized />}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      {k.prizes.map(p => (
                        <div key={p.id} className="flex items-center gap-2 h-10">
                          <div className="w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-stone-50 border border-stone-200">
                            {p.image_url && <Image src={p.image_url} alt="" width={80} height={80} className="w-full h-full object-cover" unoptimized />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] leading-[1.4] text-stone-600 truncate">
                              <b className="font-bold text-stone-800">{p.grade}</b>　{p.name}
                            </p>
                            {p.value != null ? (
                              <p className="text-sm font-extrabold text-stone-800" style={{ fontVariantNumeric: 'tabular-nums' }}>約{p.value.toLocaleString()}円</p>
                            ) : (
                              <p className="text-[11px] text-stone-400">相場は集計中</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* いま注目されている発売予定 */}
      {trend.length > 0 && (
        <section className="px-5 py-5 border-t-8 border-stone-100">
          <h2 className="text-base font-black text-stone-800">いま注目されている発売予定</h2>
          <p className="text-[11px] font-bold text-stone-500 mt-0.5 mb-1.5">来週以降・この7日間によく見られている順</p>
          <div>
            {trend.map((k, i) => (
              <Link key={k.id} href={`/kuji/${k.id}`} className="flex items-center gap-3 py-[11px] border-t border-stone-100 press group">
                <span className="w-[18px] flex-shrink-0 text-base font-black text-shu text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-stone-800 truncate group-hover:text-shu transition-colors">{shortTitle(k.title)}</p>
                  <p className="text-[11px] text-stone-500 mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {shortDate(k.release_at)}（{weekdayLabel(k.release_at)}）発売 ・ {k.price.toLocaleString()}円
                  </p>
                </div>
                <RelDays date={k.release_at} variant="pill-muted" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Column — numbered list matching /blog list style */}
      <div className="px-5 pb-7 border-t-8 border-stone-100">
        <div className="pt-5 mb-3">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-base font-black text-stone-800">コラム</h2>
              <p className="text-xs text-shu font-bold tracking-wider">COLUMN</p>
            </div>
            <Link href="/blog" className="text-xs text-shu font-semibold hover:underline press">一覧を見る →</Link>
          </div>
        </div>
        <div>
          {featuredPosts.map((post, i) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="w-full text-left flex items-start gap-4 py-4 border-t border-stone-200 press group"
            >
              <span className="text-[15px] font-black text-stone-300 mt-0.5" style={{ minWidth: 28, fontVariantNumeric: 'tabular-nums' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-stone-400 tracking-wider font-semibold mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtPostDate(post.date)}</p>
                <p className="text-[13.5px] font-bold text-stone-800 leading-snug mb-1 group-hover:text-shu transition-colors" style={{ textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{post.title}</p>
                <p className="text-[11.5px] text-stone-500 leading-relaxed line-clamp-1">{post.summary}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-stone-300 flex-shrink-0 mt-2 group-hover:text-shu transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* 一番くじとは？ 値段は記事（ichiban-kuji-toha）と同じ書き方にそろえる */}
      <div className="mx-5 mb-6 p-4 bg-shu-bg rounded-xl border border-shu-bg">
        <h2 className="text-sm font-black text-stone-800 mb-1">一番くじ（いちばんくじ）とは？</h2>
        <p className="text-xs text-stone-600 leading-relaxed mb-2">
          バンダイスピリッツが展開するハズレなしのキャラクターくじ（1回750〜900円が中心）。ドラゴンボール・ワンピースなど人気アニメのフィギュアが必ず当たります。
        </p>
        <Link href="/blog/ichiban-kuji-toha" className="text-xs text-shu font-bold hover:underline">
          詳しく見る →
        </Link>
      </div>

      {/* フッターリンク（スマホのみ、PCはサイドナビに表示済み）。
          お問い合わせ・利用規約・プライバシーは全ページ共通のフッターに、ランキングは下のメニューに、
          発売済みの一覧は「発売中のくじの相場」の欄にあるので、ここには置かない */}
      <div className="md:hidden px-5 pb-8 pt-4 border-t border-stone-100">
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-2">
          {[
            { href: '/ip', label: '作品から探す' },
            { href: '/store', label: '取扱店から探す' },
            { href: '/calc#howto', label: '使い方' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="text-xs text-stone-400 hover:text-shu transition-colors">
              {item.label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-stone-300">© 2026 くじのね</p>
      </div>
    </main>
  )
}
