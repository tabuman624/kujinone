import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabase } from '../../../lib/supabase'
import { IP_NAMES, ipSlugFor } from '../../../lib/ipGroups'

// データが変わったくじページだけを再生成対象にする（毎日 09:00〜09:59 JST、vercel.json）。
//
// 背景: Vercelでは、デプロイ後に各ページが初めて再生成されると、内容が同じでもISR Writeが
// 発生する。そのため /kuji/[id] などは revalidate を長く（1日）して時間経過による再生成を
// 減らしている。ただし毎日のデプロイは新作記事があった日にしか起きないため、その他の日も
// 価格更新・発売日の切り替えが反映されるよう、変化があったページだけをここで更新する。
//
// 実行時刻の根拠: 価格cron（03:00 JST）の後、かつ発売日判定（UTC日付で切り替わる＝09:00 JST）
// の後。GitHub Actionsのスクレイピング（10:00 JST〜）による変更は、新作記事があればデプロイで、
// 無ければ翌朝の実行で反映される（LOOKBACK_HOURSで取りこぼさない）。
const LOOKBACK_HOURS = 26 // 1日1回・実行時刻が最大59分ずれるため余裕を持たせる

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const since = new Date(Date.now() - LOOKBACK_HOURS * 3600_000).toISOString()
  const todayStr = new Date().toISOString().slice(0, 10)

  const [kujiChanged, prizesChanged, releasedToday] = await Promise.all([
    // くじ本体の更新（updated_atはDBトリガーで実際の変更時のみ更新される）
    supabase.from('kuji').select('id').gte('updated_at', since),
    // 賞品の追加・相場の更新
    supabase
      .from('prizes')
      .select('kuji_id')
      .or(`created_at.gte.${since},market_price_updated_at.gte.${since},auction_price_updated_at.gte.${since}`),
    // 発売日を迎えたくじ（相場表示などの切り替えがある）
    supabase.from('kuji').select('id').eq('release_at', todayStr),
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

  for (const id of kujiIds) revalidatePath(`/kuji/${id}`)
  for (const slug of ipSlugs) revalidatePath(`/ip/${slug}`)

  const result = { since, kuji: [...kujiIds].sort((a, b) => a - b), ip: [...ipSlugs].sort() }
  console.log('revalidate-changed:', JSON.stringify(result))
  return NextResponse.json(result)
}
