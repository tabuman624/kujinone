// 一番くじの期待値計算（純粋関数・UIから独立）。
// 「残り本数」は実店舗の在庫を自動取得できないため、常に呼び出し側が与える
// 仮定値（シナリオ）として扱う。実測の残り本数であるかのような断定はしない。

export type Prize = {
  rank: string
  name: string
  remaining: number
  value: number | null
}

export type KujiInput = {
  pricePerDraw: number
  totalRemaining: number
  prizes: Prize[]
}

export type EvResult = {
  expectedValuePerDraw: number | null
  netPerDraw: number | null
  breakEvenRemaining: number | null
  verdict: 'plus' | 'minus' | 'unknown'
  topPrizeRatio: number
  figureRatio: number | null
}

const ABNORMAL_VALUE_MULTIPLIER = 5

function isAbnormal(expectedValuePerDraw: number, pricePerDraw: number): boolean {
  if (pricePerDraw <= 0) return false
  return expectedValuePerDraw > pricePerDraw * ABNORMAL_VALUE_MULTIPLIER
}

function isTopPrize(prize: Prize, pricePerDraw: number): boolean {
  return prize.value != null && prize.value > pricePerDraw
}

const UNKNOWN_RESULT: Omit<EvResult, 'topPrizeRatio'> = {
  expectedValuePerDraw: null,
  netPerDraw: null,
  breakEvenRemaining: null,
  verdict: 'unknown',
  figureRatio: null,
}

export function calculateEv(input: KujiInput): EvResult {
  const { pricePerDraw, totalRemaining, prizes } = input

  if (totalRemaining <= 0) {
    return { ...UNKNOWN_RESULT, topPrizeRatio: 0 }
  }

  const topCount = prizes.reduce((sum, p) => sum + (isTopPrize(p, pricePerDraw) ? p.remaining : 0), 0)
  const topPrizeRatio = topCount / totalRemaining

  const valuedPrizes = prizes.filter(p => p.value != null)
  if (valuedPrizes.length === 0) {
    return { ...UNKNOWN_RESULT, topPrizeRatio }
  }

  const weightedSum = valuedPrizes.reduce((sum, p) => sum + p.remaining * (p.value as number), 0)
  const expectedValuePerDraw = weightedSum / totalRemaining

  if (isAbnormal(expectedValuePerDraw, pricePerDraw)) {
    return { ...UNKNOWN_RESULT, topPrizeRatio }
  }

  const netPerDraw = expectedValuePerDraw - pricePerDraw
  const verdict: EvResult['verdict'] = netPerDraw > 0 ? 'plus' : netPerDraw < 0 ? 'minus' : 'unknown'
  const breakEvenRemaining = calculateBreakEvenRemaining(input)

  return { expectedValuePerDraw, netPerDraw, breakEvenRemaining, verdict, topPrizeRatio, figureRatio: null }
}

// 上位賞（価格を超える価値の賞）の残り本数を固定し、下位賞だけを減らしていったときに
// E(期待価値) が pricePerDraw を上回る最大の総本数Nを線形探索する。解なしは null。
function calculateBreakEvenRemaining(input: KujiInput): number | null {
  const { pricePerDraw, prizes } = input
  const topPrizes = prizes.filter(p => isTopPrize(p, pricePerDraw))
  const lowerPrizes = prizes.filter(p => !isTopPrize(p, pricePerDraw) && p.value != null)

  const topCount = topPrizes.reduce((sum, p) => sum + p.remaining, 0)
  if (topCount <= 0) return null

  const topValueSum = topPrizes.reduce((sum, p) => sum + p.remaining * (p.value as number), 0)
  const lowerCount = lowerPrizes.reduce((sum, p) => sum + p.remaining, 0)
  const lowerValueSum = lowerPrizes.reduce((sum, p) => sum + p.remaining * (p.value as number), 0)
  const lowerAvgValue = lowerCount > 0 ? lowerValueSum / lowerCount : 0

  const maxN = topCount + lowerCount
  for (let n = maxN; n >= topCount; n--) {
    const lowerN = n - topCount
    const e = (topValueSum + lowerAvgValue * lowerN) / n
    if (e >= pricePerDraw) return n
  }
  return null
}

// 狙い賞が当たるまでの平均回数（非復元抽出、負の超幾何分布）。
// N/k ではなく (N+1)/(k+1) が正しい（開けたら減るため）。
export function expectedDraws(totalRemaining: number, targetRemaining: number): number {
  return (totalRemaining + 1) / (targetRemaining + 1)
}
