import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabase } from '../../../lib/supabase'
import { IP_NAMES, ipSlugFor } from '../../../lib/ipGroups'

// データが変わったくじページと、日付依存の一覧ページを再生成対象にする（毎日 12:00〜12:59 JST、vercel.json）。
// もう1つの呼び出し元は GitHub Actions のスクレイピングの最後（?scope=scrape、下の SCRAPE_* を参照）。
//
// 背景: Vercelでは、デプロイ後に各ページが初めて再生成されると、内容が同じでもISR Writeが
// 発生する。そのため /kuji/[id] などは revalidate を長く（1日）して時間経過による再生成を
// 減らしている。新作速報（/news）の廃止（2026-11）で毎日のボットデプロイも無くなったため、
// 価格更新・発売日の切り替えなどは、変化があったページだけをここで更新して反映する。
//
// 実行時刻の根拠: 価格cron（03:00 JST）と発売日判定（UTC日付で切り替わる＝09:00 JST）の後に置く。
// GitHub Actionsのスクレイピングは 10:00 JST の予定だが、実際には毎日 14〜16時台に始まる
// （GitHubの混雑による遅れ。2026-10〜11の実行履歴で確認）。そのため新作の分は、スクレイピングの最後に
// ?scope=scrape で呼んでその日のうちに反映し、ここでは翌日に価格の変化などとあわせて拾う（LOOKBACK_HOURS）。
const LOOKBACK_HOURS = 26 // 1日1回・実行時刻が最大59分ずれるため余裕を持たせる

// ?scope=scrape（スクレイピング直後）: 新しく登録・変更されたくじと賞だけを見て、そのくじのページと、
// 新作が載る一覧・サイトマップだけを更新する。何も増えていない日は何も更新しない。
// 価格の更新（同じワークフローの相場取得）は対象にしない。くじの数が多く、毎日2回再生成すると
// ISR Writes が倍になるため（再生成は内容が同じでも Writes に数えられる。2026-11-01 確認）。
// ワークフローは30分ほどで終わるので、6時間あれば手動の再実行にも足りる。
const SCRAPE_LOOKBACK_HOURS = 6
const SCRAPE_PATHS = ['/schedule', '/sitemap-kuji.xml', '/sitemap-ip.xml']

// 日付（UTC）やくじ一覧全体に依存するページ。revalidateを1日にしているため、
// 日付が切り替わった後のこの実行で毎日必ず更新する。
const DAILY_PATHS = [
  '/',
  '/schedule',
  '/schedule/archive',
  '/ranking/wanted',
  '/data',
  '/ip',
  '/store',
  '/sitemap.xml',
  '/sitemap-kuji.xml',
  '/sitemap-blog.xml',
  '/sitemap-ip.xml',
  '/sitemap-store.xml',
  '/sitemap-static.xml',
  '/blog/feed.xml',
]

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const scrapeScope = new URL(req.url).searchParams.get('scope') === 'scrape'
  const since = new Date(Date.now() - (scrapeScope ? SCRAPE_LOOKBACK_HOURS : LOOKBACK_HOURS) * 3600_000).toISOString()
  const todayStr = new Date().toISOString().slice(0, 10)

  const [kujiChanged, prizesChanged, releasedToday] = await Promise.all([
    // くじ本体の更新（updated_atはDBトリガーで実際の変更時のみ更新される）
    supabase.from('kuji').select('id').gte('updated_at', since),
    // 賞品の追加・相場の更新（scrape では賞品の追加だけ）
    scrapeScope
      ? supabase.from('prizes').select('kuji_id').gte('created_at', since)
      : supabase
        .from('prizes')
        .select('kuji_id')
        .or(`created_at.gte.${since},market_price_updated_at.gte.${since},auction_price_updated_at.gte.${since}`),
    // 発売日を迎えたくじ（相場表示などの切り替えがある）。scrape では見ない（12時の実行が拾う）
    scrapeScope
      ? Promise.resolve({ data: [] as { id: number }[], error: null })
      : supabase.from('kuji').select('id').eq('release_at', todayStr),
  ])

  const firstError = kujiChanged.error ?? prizesChanged.error ?? releasedToday.error
  if (firstError) {
    console.error('revalidate-changed: Supabase query failed:', firstError.message)
    return NextResponse.json({ error: firstError.message }, { status: 500 })
  }

  const kujiIds = new Set<number>([
    ...(kujiChanged.data ?? []).map(k => k.id as number),
    ...(prizesChanged.data ?? []).map(p => p.kuji_id as number),
    ...(releasedToday.data ?? []).map(k => k.id as number),
  ])

  // 対象くじが属するシリーズページ（/ip/[slug]）も更新する
  const ipSlugs = new Set<string>()
  if (kujiIds.size > 0) {
    const { data: kujiRows, error } = await supabase
      .from('kuji')
      .select('id, product_id')
      .in('id', [...kujiIds])
    if (error) {
      console.error('revalidate-changed: kuji lookup failed:', error.message)
    }
    for (const k of kujiRows ?? []) {
      if (!k.product_id) continue
      const slug = ipSlugFor(k.product_id as string)
      if (IP_NAMES[slug]) ipSlugs.add(slug)
    }
  }

  // scrape で何も増えていなければ、一覧も更新しない（再生成は内容が同じでも Writes になる）
  const listPaths = scrapeScope ? (kujiIds.size > 0 ? SCRAPE_PATHS : []) : DAILY_PATHS

  for (const id of kujiIds) revalidatePath(`/kuji/${id}`)
  for (const slug of ipSlugs) revalidatePath(`/ip/${slug}`)
  for (const p of listPaths) revalidatePath(p)

  const result = {
    scope: scrapeScope ? 'scrape' : 'daily',
    since,
    kuji: [...kujiIds].sort((a, b) => a - b),
    ip: [...ipSlugs].sort(),
    paths: listPaths,
  }
  console.log('revalidate-changed:', JSON.stringify(result))
  return NextResponse.json(result)
}
