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

// ─── Yahoo! ショッピング API ────────────────────────────────────────────────

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
    return prices.length > 0 ? median(prices) : null
  } catch {
    return null
  }
}

// ─── Yahoo! オークション API（即決のみ） ───────────────────────────────────

async function fetchYahooAuctionPrice(keyword: string): Promise<number | null> {
  if (!YAHOO_APP_ID) return null
  try {
    const params = new URLSearchParams({
      appid: YAHOO_APP_ID,
      query: keyword,
      type: 'buynow',      // 即決のみ（1円スタートのオークション除外）
      minPrice: String(PRICE_MIN),
      maxPrice: String(PRICE_MAX),
      hits: '10',
      sort: '+price',
      output: 'json',
    })
    const res = await fetch(
      `https://auctions.yahooapis.jp/AuctionWebService/V2/json/auctionSearch?${params}`,
      { signal: AbortSignal.timeout(8000) }
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
    return prices.length > 0 ? median(prices) : null
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

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

function buildKeyword(prizeName: string, kujiTitle: string, grade: string): string {
  const itemName = prizeName.replace(/^[A-ZＡ-Ｚa-z\w]*賞\s*/, '').trim() || prizeName
  const titleCore = kujiTitle.replace(/^一番くじ\s*/, '').trim()
  const titlePrefix = titleCore.split(/\s+/)[0] ?? ''
  const prefix = titlePrefix ? `一番くじ ${titlePrefix}` : '一番くじ'
  return grade ? `${prefix} ${grade} ${itemName}` : `${prefix} ${itemName}`
}

function isFresh(updatedAt: string | null): boolean {
  if (!updatedAt) return false
  const diff = (Date.now() - new Date(updatedAt).getTime()) / 36e5 // hours
  return diff < CACHE_TTL_HOURS
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const kujiId = req.nextUrl.searchParams.get('kuji_id')
  if (!kujiId) return NextResponse.json({ error: 'missing kuji_id' }, { status: 400 })

  // くじタイトル取得
  const { data: kuji } = await supabase
    .from('kuji')
    .select('title')
    .eq('id', kujiId)
    .single()

  const kujiTitle = kuji?.title ?? ''

  // 賞一覧取得
  const { data: prizes } = await supabase
    .from('prizes')
    .select('id, name, grade, market_price, market_price_updated_at')
    .eq('kuji_id', kujiId)
    .order('sort_order')

  if (!prizes) return NextResponse.json({ prices: [] })

  // キャッシュが全て新鮮なら即返す
  const allFresh = prizes.every(p => p.market_price !== null && isFresh(p.market_price_updated_at))
  if (allFresh) {
    return NextResponse.json({
      prices: prizes.map(p => ({ id: p.id, price: p.market_price })),
      cached: true,
    })
  }

  // 要更新の賞を並列取得
  const stale = prizes.filter(p => p.market_price === null || !isFresh(p.market_price_updated_at))

  const results = await Promise.allSettled(
    stale.map(async prize => {
      const keyword = buildKeyword(prize.name, kujiTitle, prize.grade)

      // ヤフオク（即決）→ Yahoo ショッピング の順で試す
      const price =
        (await fetchYahooAuctionPrice(keyword)) ??
        (await fetchYahooShoppingPrice(keyword))

      if (price !== null) {
        await supabase
          .from('prizes')
          .update({ market_price: price, market_price_updated_at: new Date().toISOString() })
          .eq('id', prize.id)
      }

      return { id: prize.id, price }
    })
  )

  // 最新の全賞データを返す
  const updatedMap: Record<number, number | null> = {}
  for (const r of results) {
    if (r.status === 'fulfilled') updatedMap[r.value.id] = r.value.price
  }

  const response = prizes.map(p => ({
    id: p.id,
    price: updatedMap[p.id] !== undefined ? updatedMap[p.id] : p.market_price,
  }))

  return NextResponse.json({ prices: response, cached: false })
}
