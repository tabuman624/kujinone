import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const YAHOO_APP_ID = process.env.YAHOO_APP_ID ?? ''
const YAHOO_AUCTION_CLIENT_ID     = process.env.YAHOO_AUCTION_CLIENT_ID ?? ''
const YAHOO_AUCTION_CLIENT_SECRET = process.env.YAHOO_AUCTION_CLIENT_SECRET ?? ''
const YAHOO_AUCTION_REFRESH_TOKEN = process.env.YAHOO_AUCTION_REFRESH_TOKEN ?? ''

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

// ─── Yahoo! オークション API（OAuth・即決・価格範囲） ──────────────────────

async function getYahooAccessToken(): Promise<string | null> {
  if (!YAHOO_AUCTION_CLIENT_ID || !YAHOO_AUCTION_CLIENT_SECRET || !YAHOO_AUCTION_REFRESH_TOKEN) {
    return null
  }
  try {
    const res = await fetch('https://auth.login.yahoo.co.jp/yconnect/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: YAHOO_AUCTION_REFRESH_TOKEN,
        client_id: YAHOO_AUCTION_CLIENT_ID,
        client_secret: YAHOO_AUCTION_CLIENT_SECRET,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.access_token ?? null
  } catch {
    return null
  }
}

type AuctionRange = { min: number; max: number }

async function fetchYahooAuctionRange(keyword: string): Promise<AuctionRange | null> {
  const accessToken = await getYahooAccessToken()
  if (!accessToken) return null
  try {
    const params = new URLSearchParams({
      query: keyword,
      type: 'buynow',
      minPrice: String(PRICE_MIN),
      maxPrice: String(PRICE_MAX),
      hits: '20',
      sort: '+price',
      output: 'json',
    })
    const res = await fetch(
      `https://auctions.yahooapis.jp/AuctionWebService/V2/json/auctionSearch?${params}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const hits = data.ResultSet?.Result?.Item ?? []
    const prices: number[] = []
    for (const item of Array.isArray(hits) ? hits : [hits]) {
      const price = Number(item.BidOrBuy)
      const title = item.Title ?? ''
      if (price && PRICE_MIN <= price && price <= PRICE_MAX && isRelevant(keyword, title)) {
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
    const range = await fetchYahooAuctionRange(kw)
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

  // 両ソースともキャッシュが新鮮なら即返す
  const allFresh = prizes.every(p =>
    isFresh(p.market_price_updated_at) && isFresh(p.auction_price_updated_at)
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

      const stableNeedsUpdate = !isFresh(prize.market_price_updated_at)
      const auctionNeedsUpdate = !isFresh(prize.auction_price_updated_at)

      // 安定価格（Yahoo Shopping）とヤフオク範囲を並列取得
      const [newStable, newAuction] = await Promise.all([
        stableNeedsUpdate ? fetchStablePriceWithFallback(keywords) : Promise.resolve(null),
        auctionNeedsUpdate ? fetchAuctionRangeWithFallback(keywords) : Promise.resolve(null),
      ])

      // DB更新
      const updates: Record<string, unknown> = {}
      if (stableNeedsUpdate) {
        updates.market_price = newStable
        updates.market_price_updated_at = now
      }
      if (auctionNeedsUpdate) {
        updates.auction_price_min = newAuction?.min ?? null
        updates.auction_price_max = newAuction?.max ?? null
        updates.auction_price_updated_at = now
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('prizes').update(updates).eq('id', prize.id)
      }

      return {
        id: prize.id,
        stable_price: stableNeedsUpdate ? newStable : prize.market_price,
        auction_min: auctionNeedsUpdate ? (newAuction?.min ?? null) : prize.auction_price_min,
        auction_max: auctionNeedsUpdate ? (newAuction?.max ?? null) : prize.auction_price_max,
      }
    })
  )

  const response = results.map(r =>
    r.status === 'fulfilled' ? r.value : null
  ).filter(Boolean)

  return NextResponse.json({ prices: response, cached: false })
}
