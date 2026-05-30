import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const YAHOO_APP_ID = process.env.YAHOO_APP_ID ?? ''

const CACHE_TTL_HOURS = 6
const PRICE_MIN = 500
const PRICE_MAX = 200_000

// ─── Yahoo! ショッピング API（安定価格） ────────────────────────────────────

async function fetchYahooShoppingPrice(keyword: string): Promise<number | null> {
  if (!YAHOO_APP_ID) return null
  try {
    const params = new URLSearchParams({
      appid: YAHOO_APP_ID,
      query: keyword,
      results: '10',
      sort: '+price',
    })
    const res = await fetch(
      `https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch?${params}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const prices: number[] = []
    for (const hit of data.hits ?? []) {
      const price = hit.price
      if (price && PRICE_MIN <= price && price <= PRICE_MAX && isRelevant(keyword, hit.name ?? '')) {
        prices.push(price)
      }
    }
    return prices.length > 0 ? calcMedian(prices) : null
  } catch {
    return null
  }
}

// ─── Yahoo! オークション 落札済み検索（直接スクレイピング） ─────────────────
// robots.txt で /closedsearch/closedsearch が明示的に許可されているパス

type AuctionRange = { min: number; max: number }

async function fetchYahooAuctionClosedRange(keyword: string): Promise<AuctionRange | null> {
  try {
    const params = new URLSearchParams({
      p: keyword,
      n: '20',
      s1: 'end',
      o1: 'd',
    })
    const res = await fetch(
      `https://auctions.yahoo.co.jp/closedsearch/closedsearch?${params}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      }
    )
    if (!res.ok) return null
    const html = await res.text()

    const prices: number[] = []

    // 各オークション結果は </li> で区切られる
    const blocks = html.split('</li>')

    for (const block of blocks) {
      // 落札価格を抽出（「落札X,XXX円」形式）
      const priceMatch = block.match(/落札([\d,]+)円/)
      if (!priceMatch) continue

      const price = parseInt(priceMatch[1].replace(/,/g, ''), 10)
      if (!price || price < PRICE_MIN || price > PRICE_MAX) continue

      // タイトルを抽出して関連性チェック（取れない場合は通す）
      const titleMatch =
        block.match(/<a[^>]+href="[^"]*\/auction\/[^"]*"[^>]*>([^<]{4,})<\/a>/) ??
        block.match(/alt="([^"]{4,})"/) ??
        block.match(/title="([^"]{4,})"/)
      const title = titleMatch?.[1]?.trim() ?? ''

      if (!title || isRelevant(keyword, title)) {
        prices.push(price)
      }
    }

    if (prices.length === 0) return null
    const sorted = [...prices].sort((a, b) => a - b)
    return { min: sorted[0], max: sorted[sorted.length - 1] }
  } catch {
    return null
  }
}

// ─── ユーティリティ ─────────────────────────────────────────────────────────

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

  const tier0 = grade
    ? `一番くじ ${titleFull} ${grade} ${itemName}`
    : `一番くじ ${titleFull} ${itemName}`
  const tier1 = grade
    ? `一番くじ ${titlePrefix} ${grade} ${itemName}`
    : `一番くじ ${titlePrefix} ${itemName}`
  const tier2 = grade ? `一番くじ ${grade} ${itemName}` : `一番くじ ${itemName}`
  const tier3 = `一番くじ ${itemName}`

  return [...new Set([tier0, tier1, tier2, tier3])]
}

function isFresh(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return false
  return (Date.now() - new Date(updatedAt).getTime()) / 36e5 < CACHE_TTL_HOURS
}

// ─── フォールバック付き取得 ─────────────────────────────────────────────────

async function fetchStablePriceWithFallback(keywords: string[]): Promise<number | null> {
  for (const kw of keywords) {
    const price = await fetchYahooShoppingPrice(kw)
    if (price !== null) return price
  }
  return null
}

async function fetchAuctionRangeWithFallback(keywords: string[]): Promise<AuctionRange | null> {
  for (const kw of keywords) {
    const range = await fetchYahooAuctionClosedRange(kw)
    if (range !== null) return range
  }
  return null
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const kujiId = req.nextUrl.searchParams.get('kuji_id')
  if (!kujiId) return NextResponse.json({ error: 'missing kuji_id' }, { status: 400 })

  const { data: kuji } = await supabase
    .from('kuji')
    .select('title')
    .eq('id', kujiId)
    .single()

  const kujiTitle = kuji?.title ?? ''

  const { data: prizes } = await supabase
    .from('prizes')
    .select('id, name, grade, market_price, market_price_updated_at, auction_price_min, auction_price_max, auction_price_updated_at')
    .eq('kuji_id', kujiId)
    .order('sort_order')

  if (!prizes) return NextResponse.json({ prices: [] })

  // 両ソースとも値あり＆キャッシュが新鮮なら即返す
  const allFresh = prizes.every(p =>
    p.market_price !== null && isFresh(p.market_price_updated_at) &&
    p.auction_price_min !== null && isFresh(p.auction_price_updated_at)
  )
  if (allFresh) {
    return NextResponse.json({
      prices: prizes.map(p => ({
        id: p.id,
        stable_price: p.market_price,
        auction_min: p.auction_price_min,
        auction_max: p.auction_price_max,
      })),
      cached: true,
    })
  }

  // 要更新の賞を並列処理
  const now = new Date().toISOString()
  const results = await Promise.allSettled(
    prizes.map(async prize => {
      const keywords = buildKeywords(prize.name, kujiTitle, prize.grade)

      const stableNeedsUpdate = prize.market_price === null || !isFresh(prize.market_price_updated_at)
      const auctionNeedsUpdate = prize.auction_price_min === null || !isFresh(prize.auction_price_updated_at)

      // 安定価格（Yahoo Shopping）とヤフオク落札範囲を並列取得
      const [newStable, newAuction] = await Promise.all([
        stableNeedsUpdate ? fetchStablePriceWithFallback(keywords) : Promise.resolve(null),
        auctionNeedsUpdate ? fetchAuctionRangeWithFallback(keywords) : Promise.resolve(null),
      ])

      // DB更新（取得できた場合のみ値を上書き。nullで既存データを消さない）
      const updates: Record<string, unknown> = {}
      if (stableNeedsUpdate) {
        updates.market_price_updated_at = now
        if (newStable !== null) updates.market_price = newStable
      }
      if (auctionNeedsUpdate) {
        updates.auction_price_updated_at = now
        if (newAuction !== null) {
          updates.auction_price_min = newAuction.min
          updates.auction_price_max = newAuction.max
        }
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('prizes').update(updates).eq('id', prize.id)
      }

      return {
        id: prize.id,
        stable_price: newStable ?? prize.market_price,
        auction_min: newAuction?.min ?? prize.auction_price_min,
        auction_max: newAuction?.max ?? prize.auction_price_max,
      }
    })
  )

  const response = results.map(r =>
    r.status === 'fulfilled' ? r.value : null
  ).filter(Boolean)

  return NextResponse.json({ prices: response, cached: false })
}
