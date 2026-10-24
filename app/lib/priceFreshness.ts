// 市場価値と取得日をセットで返す。取得から60日以上経過、またはタイムスタンプが
// 無い値（レガシーデータ）は鮮度不明として除外する。古い一点だけの相場を
// 断定的な事実として提示しないため（ExpectedValueSection.tsxと同じ方針）。
const STALE_DAYS = 60

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
  if (p.market_price != null && p.market_price_updated_at && daysSince(p.market_price_updated_at) <= STALE_DAYS) {
    return { value: p.market_price, updatedAt: p.market_price_updated_at }
  }
  if (p.auction_price_min != null && p.auction_price_updated_at && daysSince(p.auction_price_updated_at) <= STALE_DAYS) {
    return { value: p.auction_price_min, updatedAt: p.auction_price_updated_at }
  }
  return null
}
