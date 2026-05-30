import { NextRequest, NextResponse } from 'next/server'

const YAHOO_APP_ID = process.env.YAHOO_APP_ID ?? ''

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('q') ?? '一番くじ Pokemon A賞 30周年記念アクリル時計'

  const results: Record<string, unknown> = { keyword, hasApiKey: !!YAHOO_APP_ID }

  // Yahoo Shopping
  try {
    const params = new URLSearchParams({ appid: YAHOO_APP_ID, query: keyword, results: '3', sort: '+price' })
    const res = await fetch(`https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch?${params}`, { signal: AbortSignal.timeout(8000) })
    const data = await res.json()
    results.shopping = { status: res.status, hits: (data.hits ?? []).slice(0, 3).map((h: any) => ({ name: h.name, price: h.price })) }
  } catch (e: any) {
    results.shopping = { error: e.message }
  }

  // Yahoo Auction
  try {
    const params = new URLSearchParams({ appid: YAHOO_APP_ID, query: keyword, type: 'buynow', minPrice: '500', hits: '3', output: 'json' })
    const res = await fetch(`https://auctions.yahooapis.jp/AuctionWebService/V2/json/auctionSearch?${params}`, { signal: AbortSignal.timeout(8000) })
    const data = await res.json()
    const items = data.ResultSet?.Result?.Item ?? []
    const arr = Array.isArray(items) ? items : [items]
    results.auction = { status: res.status, items: arr.slice(0, 3).map((i: any) => ({ title: i.Title, bidOrBuy: i.BidOrBuy })) }
  } catch (e: any) {
    results.auction = { error: e.message }
  }

  return NextResponse.json(results)
}
