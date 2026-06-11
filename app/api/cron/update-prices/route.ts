import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PRICE_MIN = 500
const PRICE_MAX = 200_000
const OLD_KUJI_BATCH_SIZE = 15  // 古いくじのローテーション件数（タイムアウト対策）
const CONCURRENCY = 5           // 並列リクエスト数

// ─── ユーティリティ ──────────────────────────────────────────────────────────

function isRelevant(keyword: string, title: string, threshold = 0.35): boolean {
  const kwWords = new Set(keyword.toLowerCase().split(/[\s　・「」【】（）()]+/).filter(Boolean))
  if (kwWords.size === 0) return true
  const titleLower = title.toLowerCase()
  const matched = [...kwWords].filter(w => titleLower.includes(w)).length
  return matched / kwWords.size >= threshold
}

function calcMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

function normalizeAccents(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function extractItemName(prizeName: string): string {
  return prizeName.replace(/^[A-ZＡ-Ｚa-z\w]*賞\s*/, '').trim() || prizeName
}

function buildKeywords(prizeName: string, kujiTitle: string, grade: string): string[] {
  const itemName = extractItemName(prizeName)
  const titleCore = kujiTitle.replace(/^一番くじ\s*/, '').trim()
  const titleFull = normalizeAccents(titleCore)
  const titlePrefix = normalizeAccents(titleCore.split(/\s+/)[0] ?? '')
  const tier0 = grade ? `一番くじ ${titleFull} ${grade} ${itemName}` : `一番くじ ${titleFull} ${itemName}`
  const tier1 = grade ? `一番くじ ${titlePrefix} ${grade} ${itemName}` : `一番くじ ${titlePrefix} ${itemName}`
  const tier2 = grade ? `一番くじ ${grade} ${itemName}` : `一番くじ ${itemName}`
  const tier3 = `一番くじ ${itemName}`
  return [...new Set([tier0, tier1, tier2, tier3])]
}

async function fetchAuctionMedian(keyword: string): Promise<number | null> {
  try {
    const params = new URLSearchParams({ p: keyword, n: '20', s1: 'end', o1: 'd' })
    const res = await fetch(
      `https://auctions.yahoo.co.jp/closedsearch/closedsearch?${params}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return null
    const html = await res.text()
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!nextDataMatch) return null
    const nextData = JSON.parse(nextDataMatch[1])
    const items: Array<{ price?: number; title?: string }> =
      nextData?.props?.pageProps?.initialState?.search?.items?.listing?.items ?? []
    const prices: number[] = []
    for (const item of items) {
      if (item.price && PRICE_MIN <= item.price && item.price <= PRICE_MAX && isRelevant(keyword, item.title ?? '')) {
        prices.push(item.price)
      }
    }
    return prices.length > 0 ? calcMedian(prices) : null
  } catch {
    return null
  }
}

// ─── 1景品を処理（価格取得→DB更新→履歴記録） ────────────────────────────────

async function processPrize(
  prize: { id: number; name: string; grade: string; kuji_id: number; auction_price_peak: number | null },
  kujiTitleMap: Record<number, string>,
  todayStr: string,
  nowIso: string,
): Promise<'updated_peak' | 'recorded' | 'no_data'> {
  const kujiTitle = kujiTitleMap[prize.kuji_id] ?? ''
  const keywords = buildKeywords(prize.name, kujiTitle, prize.grade)

  let currentPrice: number | null = null
  for (const kw of keywords) {
    const price = await fetchAuctionMedian(kw)
    if (price !== null) { currentPrice = price; break }
  }

  if (currentPrice === null) return 'no_data'

  // prizes テーブルを更新
  const updates: Record<string, unknown> = {
    auction_price_min: currentPrice,
    auction_price_max: currentPrice,
    auction_price_updated_at: nowIso,
  }
  // 最高値は上がった時だけ更新
  let peakUpdated = false
  if (!prize.auction_price_peak || currentPrice > prize.auction_price_peak) {
    updates.auction_price_peak = currentPrice
    peakUpdated = true
  }
  await supabase.from('prizes').update(updates).eq('id', prize.id)

  // price_history に記録（同日の重複はupsertで無視）
  await supabase.from('price_history').upsert(
    { prize_id: prize.id, price: currentPrice, recorded_at: todayStr },
    { onConflict: 'prize_id,recorded_at', ignoreDuplicates: true }
  )

  return peakUpdated ? 'updated_peak' : 'recorded'
}

// ─── 並列バッチ処理 ──────────────────────────────────────────────────────────

async function processBatch(
  prizes: Array<{ id: number; name: string; grade: string; kuji_id: number; auction_price_peak: number | null }>,
  kujiTitleMap: Record<number, string>,
  todayStr: string,
  nowIso: string,
): Promise<{ scanned: number; peakUpdated: number }> {
  let peakUpdated = 0
  for (let i = 0; i < prizes.length; i += CONCURRENCY) {
    const chunk = prizes.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      chunk.map(p => processPrize(p, kujiTitleMap, todayStr, nowIso))
    )
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value === 'updated_peak') peakUpdated++
    }
  }
  return { scanned: prizes.length, peakUpdated }
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function GET(req: Request) {
  // Cron認証
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const nowIso = today.toISOString()
  const isSaturday = today.getDay() === 6

  // 日付境界を計算
  const day7 = new Date(today); day7.setDate(today.getDate() - 7)
  const day90 = new Date(today); day90.setDate(today.getDate() - 90)
  const day7Str = day7.toISOString().slice(0, 10)
  const day90Str = day90.toISOString().slice(0, 10)

  const stats = { newKuji: 0, oldKuji: 0, peakUpdated: 0 }

  // ── ① 発売7日以内のくじ（毎日計測） ────────────────────────────────────────
  const { data: newKujiList } = await supabase
    .from('kuji')
    .select('id, title')
    .eq('is_active', true)
    .gte('release_at', day7Str)

  if (newKujiList?.length) {
    const kujiTitleMap = Object.fromEntries(newKujiList.map(k => [k.id, k.title as string]))
    const { data: newPrizes } = await supabase
      .from('prizes')
      .select('id, name, grade, kuji_id, auction_price_peak')
      .in('kuji_id', newKujiList.map(k => k.id))

    if (newPrizes?.length) {
      const result = await processBatch(newPrizes, kujiTitleMap, todayStr, nowIso)
      stats.newKuji = result.scanned
      stats.peakUpdated += result.peakUpdated
    }
  }

  // ── ② 発売8〜90日のくじ（土曜のみ・ローテーション） ─────────────────────────
  if (isSaturday) {
    const { data: oldKujiList } = await supabase
      .from('kuji')
      .select('id, title')
      .eq('is_active', true)
      .gte('release_at', day90Str)
      .lt('release_at', day7Str)

    if (oldKujiList?.length) {
      const kujiTitleMap = Object.fromEntries(oldKujiList.map(k => [k.id, k.title as string]))
      const { data: oldPrizes } = await supabase
        .from('prizes')
        .select('id, name, grade, kuji_id, auction_price_peak')
        .in('kuji_id', oldKujiList.map(k => k.id))
        .order('auction_price_updated_at', { ascending: true, nullsFirst: true })
        .limit(OLD_KUJI_BATCH_SIZE)

      if (oldPrizes?.length) {
        const result = await processBatch(oldPrizes, kujiTitleMap, todayStr, nowIso)
        stats.oldKuji = result.scanned
        stats.peakUpdated += result.peakUpdated
      }
    }
  }

  return NextResponse.json({
    date: todayStr,
    isSaturday,
    newKujiPrizes: stats.newKuji,
    oldKujiPrizes: stats.oldKuji,
    peakUpdated: stats.peakUpdated,
  })
}
