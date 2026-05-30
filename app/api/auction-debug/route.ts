import { NextRequest, NextResponse } from 'next/server'

const YAHOO_AUCTION_CLIENT_ID     = process.env.YAHOO_AUCTION_CLIENT_ID ?? ''
const YAHOO_AUCTION_CLIENT_SECRET = process.env.YAHOO_AUCTION_CLIENT_SECRET ?? ''
const YAHOO_AUCTION_REFRESH_TOKEN = process.env.YAHOO_AUCTION_REFRESH_TOKEN ?? ''

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('q') ?? '一番くじ 鬼滅の刃 A賞'
  const result: Record<string, unknown> = { keyword }

  // ① トークン取得
  let accessToken: string | null = null
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
    const data = await res.json()
    accessToken = data.access_token ?? null
    result.token = {
      status: res.status,
      hasToken: !!accessToken,
      error: data.error ?? null,
      errorDescription: data.error_description ?? null,
    }
  } catch (e: any) {
    result.token = { error: e.message }
  }

  if (!accessToken) {
    return NextResponse.json(result)
  }

  // ② オークション検索
  try {
    const params = new URLSearchParams({
      query: keyword,
      type: 'buynow',
      minPrice: '500',
      maxPrice: '200000',
      hits: '5',
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
    const data = await res.json()
    const hits = data.ResultSet?.Result?.Item ?? []
    const arr = Array.isArray(hits) ? hits : [hits]
    result.auction = {
      status: res.status,
      totalCount: data.ResultSet?.['@attributes']?.totalResultsAvailable ?? 0,
      items: arr.slice(0, 5).map((i: any) => ({ title: i.Title, bidOrBuy: i.BidOrBuy })),
      rawError: data.Error ?? null,
    }
  } catch (e: any) {
    result.auction = { error: e.message }
  }

  return NextResponse.json(result)
}
