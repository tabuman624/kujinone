// 簡易テストスクリプト。フレームワーク未導入のため tsx で直接実行する: npm run test:ev
import { calculateEv, expectedDraws, type KujiInput } from './ev'

let failed = 0

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const ok = actual === expected || (Number.isNaN(actual as number) && Number.isNaN(expected as number))
  if (!ok) {
    failed++
    console.error(`✗ ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  } else {
    console.log(`✓ ${label}`)
  }
}

function assertClose(actual: number | null, expected: number, label: string, epsilon = 0.01) {
  if (actual === null || Math.abs(actual - expected) > epsilon) {
    failed++
    console.error(`✗ ${label}: expected ≈${expected}, got ${actual}`)
  } else {
    console.log(`✓ ${label}`)
  }
}

// 1. 正常系: 価格980円、A賞1本8000円、B賞3本3000円、下位76本300円
{
  const input: KujiInput = {
    pricePerDraw: 980,
    totalRemaining: 80,
    prizes: [
      { rank: 'A', name: 'A賞', remaining: 1, value: 8000 },
      { rank: 'B', name: 'B賞', remaining: 3, value: 3000 },
      { rank: 'C', name: '下位賞', remaining: 76, value: 300 },
    ],
  }
  const result = calculateEv(input)
  const expectedE = (1 * 8000 + 3 * 3000 + 76 * 300) / 80
  assertClose(result.expectedValuePerDraw, expectedE, '正常系: expectedValuePerDraw')
  assertClose(result.netPerDraw, expectedE - 980, '正常系: netPerDraw')
  assertEqual(result.verdict, expectedE - 980 > 0 ? 'plus' : 'minus', '正常系: verdict')
}

// 2. totalRemaining = 0 → 全て null、verdict: 'unknown'
{
  const input: KujiInput = {
    pricePerDraw: 980,
    totalRemaining: 0,
    prizes: [{ rank: 'A', name: 'A賞', remaining: 1, value: 8000 }],
  }
  const result = calculateEv(input)
  assertEqual(result.expectedValuePerDraw, null, 'totalRemaining=0: expectedValuePerDraw null')
  assertEqual(result.netPerDraw, null, 'totalRemaining=0: netPerDraw null')
  assertEqual(result.breakEvenRemaining, null, 'totalRemaining=0: breakEvenRemaining null')
  assertEqual(result.verdict, 'unknown', 'totalRemaining=0: verdict unknown')
}

// 3. value が全て null → 金額系が null
{
  const input: KujiInput = {
    pricePerDraw: 980,
    totalRemaining: 80,
    prizes: [
      { rank: 'A', name: 'A賞', remaining: 1, value: null },
      { rank: 'C', name: '下位賞', remaining: 79, value: null },
    ],
  }
  const result = calculateEv(input)
  assertEqual(result.expectedValuePerDraw, null, 'value全null: expectedValuePerDraw null')
  assertEqual(result.netPerDraw, null, 'value全null: netPerDraw null')
  assertEqual(result.verdict, 'unknown', 'value全null: verdict unknown')
}

// 4. 異常値: 期待値が価格の5倍超 → null
{
  const input: KujiInput = {
    pricePerDraw: 980,
    totalRemaining: 10,
    prizes: [{ rank: 'A', name: 'A賞', remaining: 10, value: 10000 }], // E = 10000 > 980*5
  }
  const result = calculateEv(input)
  assertEqual(result.expectedValuePerDraw, null, '異常値: expectedValuePerDraw null')
  assertEqual(result.verdict, 'unknown', '異常値: verdict unknown')
}

// 5. breakEvenRemaining が解なしのケース（上位賞なし）
{
  const input: KujiInput = {
    pricePerDraw: 980,
    totalRemaining: 80,
    prizes: [{ rank: 'C', name: '下位賞', remaining: 80, value: 300 }],
  }
  const result = calculateEv(input)
  assertEqual(result.breakEvenRemaining, null, '上位賞なし: breakEvenRemaining null')
}

// 6. expectedDraws: 負の超幾何分布 (N+1)/(k+1)
assertClose(expectedDraws(79, 0), 80 / 1, 'expectedDraws: k=0')
assertClose(expectedDraws(79, 3), 80 / 4, 'expectedDraws: k=3')

if (failed > 0) {
  console.error(`\n${failed} 件失敗`)
  process.exit(1)
} else {
  console.log('\n全テスト成功')
}
