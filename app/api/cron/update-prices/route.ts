import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PRICE_MIN = 500
const PRICE_MAX = 200_000
// Vercel Hobbyプランはタイムアウト10秒のため、1回あたり15件・5並列で処理
// 毎週実行することで全景品をローテーション
const BATCH_SIZE = 15
const CONCURRENCY = 5

// ─── ユーティリティ（market-price/route.ts と共通） ──────────────────────────

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

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function GET(req: Request) {
  // Cron認証（CRON_SECRETが設定されている場合のみ検証）
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // 直近90日以内に発売されたアクティブなくじを取得
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  const { data: recentKuji } = await supabase
    .from('kuji')
    .select('id, title')
    .eq('is_active', true)
    .gte('release_at', cutoff.toISOString().slice(0, 10))

  if (!recentKuji?.length) {
    return NextResponse.json({ scanned: 0, peakUpdated: 0, message: 'No recent kuji' })
  }

  const kujiIds = recentKuji.map(k => k.id)
  const kujiTitleMap = Object.fromEntries(recentKuji.map(k => [k.id, k.title as string]))

  // auction_price_updated_atが古い順に取得（毎週ローテーション）
  const { data: prizes } = await supabase
    .from('prizes')
    .select('id, name, grade, kuji_id, auction_price_peak')
    .in('kuji_id', kujiIds)
    .order('auction_price_updated_at', { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE)

  if (!prizes?.length) {
    return NextResponse.json({ scanned: 0, peakUpdated: 0, message: 'No prizes found' })
  }

  let peakUpdated = 0
  const now = new Date().toISOString()

  // CONCURRENCY件ずつ並列処理（タイムアウト対策）
  for (let i = 0; i < prizes.length; i += CONCURRENCY) {
    const chunk = prizes.slice(i, i + CONCURRENCY)
    await Promise.allSettled(
      chunk.map(async prize => {
        const kujiTitle = kujiTitleMap[prize.kuji_id] ?? ''
        const keywords = buildKeywords(prize.name, kujiTitle, prize.grade)

        let currentPrice: number | null = null
        for (const kw of keywords) {
          const price = await fetchAuctionMedian(kw)
          if (price !== null) { currentPrice = price; break }
        }

        const updates: Record<string, unknown> = { auction_price_updated_at: now }

        if (currentPrice !== null) {
          updates.auction_price_min = currentPrice
          updates.auction_price_max = currentPrice
          // 最高値を更新（下がっても上書きしない）
          if (!prize.auction_price_peak || currentPrice > (prize.auction_price_peak as number)) {
            updates.auction_price_peak = currentPrice
            peakUpdated++
          }
        }

        await supabase.from('prizes').update(updates).eq('id', prize.id)
      })
    )
  }

  return NextResponse.json({ scanned: prizes.length, peakUpdated })
}
