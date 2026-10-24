// 市場価値と取得日をセットで返す。取得から60日以上経過、またはタイムスタンプが
// 無い値（レガシーデータ）は鮮度不明として除外する。古い一点だけの相場を
// 断定的な事実として提示しないため（ExpectedValueSection.tsxと同じ方針）。
const STALE_DAYS = 60

// market_price（Yahoo!ショッピングの販売価格＝未成立の希望価格）とauction_price_min
// （ヤフオクの実際の落札価格＝成立済み取引）が両方新鮮なのに大きく食い違う場合、
// どちらかが誤スクレイピング（セット品・ロット品の誤取得など）である可能性が高い。
// 2026-10-25のOupas監査で、最大100倍食い違う実例（本番で表示されていた）が見つかった。
// 機械的にどちらが正しいか判定できないため、断定的な数値を出すより「データ不備として
// 扱う」方を選ぶ。
const DIVERGENCE_RATIO = 5

export function daysSince(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / 86_400_000
}

export type PriceSource = {
  market_price?: number | null
  market_price_updated_at?: string | null
  auction_price_min?: number | null
  auction_price_updated_at?: string | null
}

export function freshValue(p: PriceSource): { value: number; updatedAt: string } | null {
  const marketFresh = p.market_price != null && !!p.market_price_updated_at && daysSince(p.market_price_updated_at) <= STALE_DAYS
  const auctionFresh = p.auction_price_min != null && !!p.auction_price_updated_at && daysSince(p.auction_price_updated_at) <= STALE_DAYS

  if (marketFresh && auctionFresh) {
    const market = p.market_price as number
    const auction = p.auction_price_min as number
    const bigger = Math.max(market, auction)
    const smaller = Math.min(market, auction)
    if (smaller > 0 && bigger / smaller >= DIVERGENCE_RATIO) {
      return null
    }
  }

  if (marketFresh) {
    return { value: p.market_price as number, updatedAt: p.market_price_updated_at as string }
  }
  if (auctionFresh) {
    return { value: p.auction_price_min as number, updatedAt: p.auction_price_updated_at as string }
  }
  return null
}
