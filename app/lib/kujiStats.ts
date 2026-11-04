// 「データで見る一番くじ」（/data）の集計。
//
// X の水曜の豆知識（tools/x-posts/build.py の trivia）と同じ計算・同じ条件にしてある。投稿の返信から
// このページに来た人が、投稿と食い違う数字を見ないようにするため。条件を変えるときは build.py も合わせて直す。
// 丸めも Python の round（ちょうど .5 は偶数側）に合わせる（pyRound）。
//
// 入力はすべて Supabase の生の行。ここは計算だけで、取得はページ側（app/data/page.tsx）で行う。

import { median } from './priceTrend'

export type StatKuji = {
  id: number
  price: number
  release_at: string | null
  available_stores: string[] | null
  updated_at: string | null
}
export type StatPrize = {
  id: number
  kuji_id: number
  grade: string
  auction_price_min: number | null
  auction_price_updated_at: string | null
}
export type StatPricePoint = { id: number; prize_id: number; price: number; recorded_at: string }

// ---------------------------------------------------------------- 販売店の区分（build.py と同じ）
type StoreRow = { label: string; names: string[] }
const CONV_ROWS: StoreRow[] = [
  { label: 'ローソン', names: ['ローソン'] },
  { label: 'ファミリーマート', names: ['ファミリーマート'] },
  { label: 'セブン‐イレブン', names: ['セブン‐イレブン店舗'] },
  { label: 'ミニストップ', names: ['ミニストップ'] },
  { label: 'デイリーヤマザキ', names: ['デイリーヤマザキ'] },
]
const CONV_ALL = new Set([...CONV_ROWS.flatMap(r => r.names), 'その他コンビニエンスストア'])
const STORE_SHARE_ROWS: StoreRow[] = [
  { label: '一番くじ公式ショップ', names: ['一番くじ公式ショップ'] },
  { label: '一番くじONLINE', names: ['一番くじONLINE', '一番くじONLINE限定'] },
  { label: 'コンビニ（どこか1つ）', names: [...CONV_ALL] },
  { label: 'ホビーショップ', names: ['ホビーショップ'] },
  { label: '書店', names: ['書店'] },
  ...CONV_ROWS,
  { label: 'ドラッグストア（一部）', names: ['一部のドラッグストア', 'ドラッグストア'] },
]
const PAIR_SHORT: Record<string, string> = { デイリーヤマザキ: 'デイリー', ファミリーマート: 'ファミマ', 'セブン‐イレブン': 'セブン' }

// ---------------------------------------------------------------- 小さな道具
/** Python の round と同じ丸め（ちょうど半分は偶数側）。digits が負なら10の位・100の位で丸める */
export function pyRound(x: number, digits = 0): number {
  const scale = 10 ** Math.abs(digits)
  const v = digits >= 0 ? x * scale : x / scale
  const floor = Math.floor(v)
  const diff = v - floor
  const r = diff === 0.5 ? (floor % 2 === 0 ? floor : floor + 1) : Math.round(v)
  return digits >= 0 ? r / scale : r * scale
}

const pct = (n: number, total: number) => pyRound((n / total) * 100)
const day = (s: string) => Date.parse(`${s.slice(0, 10)}T00:00:00Z`) / 86_400_000
const daysBetween = (from: string, to: string) => Math.round(day(to) - day(from))
/** 0=月〜6=日（Python の weekday と同じ） */
const weekdayMon0 = (date: string) => (new Date(`${date.slice(0, 10)}T00:00:00Z`).getUTCDay() + 6) % 7
const yearMonth = (date: string) => date.slice(0, 7)
const monthOf = (date: string) => Number(date.slice(5, 7))
const hasAny = (stores: Set<string>, names: Iterable<string>) => {
  for (const n of names) if (stores.has(n)) return true
  return false
}

/** build.py の approx：1,000円以上は100円単位、未満は10円単位で丸める */
export function approxYen(v: number): number {
  return pyRound(v, v >= 1000 ? -2 : -1)
}

// ---------------------------------------------------------------- 結果の型
export type Bar = { label: string; count: number; pct: number }

export type KujiStats = {
  asof: string // 集計の基準日（JST、YYYY-MM-DD）
  dataUpdatedAt: string | null // 使ったデータの最終更新（くじ・相場）
  weekday: {
    from: string // 'YYYY-MM'
    to: string
    hasFuture: boolean
    total: number
    days: Bar[] // 月〜日
    monThuTenths: number // 月〜木曜の割合（割）
  }
  lastOneVsA: { kuji: number; loHigher: number; aHigher: number; same: number; loHigherPct: number; medianRatio: number; fromMonth: string }
  stores: { kuji: number; fromMonth: string; rows: Bar[] }
  convenience: {
    kuji: number
    fromMonth: string
    rows: { label: string; total: number; only: number }[]
    pairs: { label: string; count: number }[]
  }
  topPrize: { kuji: number; fromMonth: string; rows: Bar[] }
  priceWeek: {
    prizes: number
    kuji: number
    fromMonth: number
    toMonth: number
    down: Bar
    flat: Bar
    up: Bar
    medianTenths: number // 真ん中の賞で、発売日の何割
  } | null
  gradeRatio: {
    kuji: number
    prizes: number
    fromMonth: string
    medianPrice: number
    rows: { label: string; prizes: number; medianRatio: number; yen: number }[]
  }
}

// ---------------------------------------------------------------- 集計
export function computeKujiStats(
  kujiRows: StatKuji[],
  prizeRows: StatPrize[],
  history: StatPricePoint[],
  asof: string,
): KujiStats {
  const K = kujiRows.filter((k): k is StatKuji & { release_at: string } => !!k.release_at)
  const kujiById = new Map(K.map(k => [k.id, k]))
  const prizes = [...prizeRows].sort((a, b) => a.id - b.id)
  const prizeById = new Map(prizes.map(p => [p.id, p]))
  const storesOf = (k: StatKuji) => new Set(k.available_stores ?? [])

  // 相場を集計に使ってよい賞：発売から7日以上たったくじで、発売日以降に取れた落札相場があるもの（build.py の good）
  const good = prizes.filter(p => {
    const k = kujiById.get(p.kuji_id)
    if (!k || !p.auction_price_min || !p.auction_price_updated_at) return false
    return daysBetween(k.release_at, asof) >= 7 && p.auction_price_updated_at.slice(0, 10) >= k.release_at
  })
  const goodFrom = good.length > 0 ? yearMonth(good.map(p => kujiById.get(p.kuji_id)!.release_at).sort()[0]) : yearMonth(asof)

  const stamps = [
    ...K.map(k => k.updated_at),
    ...prizes.map(p => p.auction_price_updated_at),
  ].filter((t): t is string => !!t).sort()
  const dataUpdatedAt = stamps.at(-1) ?? null

  // ---- No.20 発売曜日：直近12か月（来月の予定まで）
  const nextMonth = (() => {
    const d = new Date(`${asof.slice(0, 8)}28T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + 5)
    return d.toISOString().slice(0, 7)
  })()
  const months = [...new Set(K.map(k => yearMonth(k.release_at)))].sort().filter(m => m <= nextMonth).slice(-12)
  const inMonths = new Set(months)
  const dayCounts = [0, 0, 0, 0, 0, 0, 0]
  for (const k of K) if (inMonths.has(yearMonth(k.release_at))) dayCounts[weekdayMon0(k.release_at)]++
  const weekTotal = dayCounts.reduce((s, n) => s + n, 0)
  const WD = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日']
  const weekday = {
    from: months[0] ?? yearMonth(asof),
    to: months.at(-1) ?? yearMonth(asof),
    hasFuture: (months.at(-1) ?? '') > yearMonth(asof),
    total: weekTotal,
    days: dayCounts.map((n, i) => ({ label: WD[i], count: n, pct: weekTotal ? pct(n, weekTotal) : 0 })),
    monThuTenths: weekTotal ? pyRound(((dayCounts[0] + dayCounts[1] + dayCounts[2] + dayCounts[3]) / weekTotal) * 10) : 0,
  }

  // ---- No.11 ラストワン賞とA賞
  const aAndLo = new Map<number, { a?: number; lo?: number }>()
  for (const p of good) {
    if (p.grade !== 'A賞' && p.grade !== 'ラストワン賞') continue
    const v = aAndLo.get(p.kuji_id) ?? {}
    if (p.grade === 'A賞') v.a = p.auction_price_min!
    else v.lo = p.auction_price_min!
    aAndLo.set(p.kuji_id, v)
  }
  const pairs = [...aAndLo.values()].filter((v): v is { a: number; lo: number } => v.a != null && v.lo != null)
  const loHigher = pairs.filter(v => v.lo > v.a).length
  const aHigher = pairs.filter(v => v.lo < v.a).length
  const lastOneVsA = {
    kuji: pairs.length,
    loHigher,
    aHigher,
    same: pairs.length - loHigher - aHigher,
    loHigherPct: pairs.length ? pct(loHigher, pairs.length) : 0,
    medianRatio: pairs.length ? median(pairs.map(v => v.lo / v.a)) : 0,
    fromMonth: goodFrom,
  }

  // ---- No.22 どこで買える / No.21 コンビニ別
  const ks = K.filter(k => (k.available_stores ?? []).length > 0)
  const storeFrom = ks.length > 0 ? yearMonth(ks.map(k => k.release_at).sort()[0]) : yearMonth(asof)
  const storeRows = STORE_SHARE_ROWS.map(r => {
    const c = ks.filter(k => hasAny(storesOf(k), r.names)).length
    return { label: r.label, count: c, pct: ks.length ? pct(c, ks.length) : 0 }
  }).sort((a, b) => b.pct - a.pct)

  const convRows = CONV_ROWS.map(r => {
    const own = new Set(r.names)
    const has = ks.filter(k => hasAny(storesOf(k), r.names))
    const only = has.filter(k => ![...storesOf(k)].some(s => CONV_ALL.has(s) && !own.has(s)))
    return { label: r.label, total: has.length, only: only.length }
  }).sort((a, b) => b.total - a.total)
  const convPairs: { label: string; count: number }[] = []
  CONV_ROWS.forEach((r1, i) => {
    for (const r2 of CONV_ROWS.slice(i + 1)) {
      const c = ks.filter(k => hasAny(storesOf(k), r1.names) && hasAny(storesOf(k), r2.names)).length
      if (c) convPairs.push({ label: `${PAIR_SHORT[r1.label] ?? r1.label}＋${PAIR_SHORT[r2.label] ?? r2.label}`, count: c })
    }
  })
  convPairs.sort((a, b) => b.count - a.count)

  // ---- No.13 相場1位の賞（ラストワン賞を除く、賞が4つ以上でA賞があるくじ）
  const byKuji = new Map<number, StatPrize[]>()
  for (const p of good) {
    if (p.grade === 'ラストワン賞') continue
    byKuji.set(p.kuji_id, [...(byKuji.get(p.kuji_id) ?? []), p])
  }
  const TOP_GRADES = ['A賞', 'B賞', 'C賞', 'D賞', 'E賞以下']
  const topCounts = new Map(TOP_GRADES.map(g => [g, 0]))
  for (const ps of byKuji.values()) {
    if (ps.length < 4 || !ps.some(p => p.grade === 'A賞')) continue
    const top = ps.reduce((best, p) =>
      p.auction_price_min! > best.auction_price_min! || (p.auction_price_min === best.auction_price_min && p.id < best.id) ? p : best)
    const g = ['A賞', 'B賞', 'C賞', 'D賞'].includes(top.grade) ? top.grade : 'E賞以下'
    topCounts.set(g, topCounts.get(g)! + 1)
  }
  const topTotal = [...topCounts.values()].reduce((s, n) => s + n, 0)
  const topPrize = {
    kuji: topTotal,
    fromMonth: goodFrom,
    rows: TOP_GRADES.map(g => ({ label: g, count: topCounts.get(g)!, pct: topTotal ? pct(topCounts.get(g)!, topTotal) : 0 })),
  }

  // ---- No.14 発売日と7日後の落札相場
  const series = new Map<number, Map<number, number>>()
  for (const r of [...history].sort((a, b) => a.id - b.id)) {
    const p = prizeById.get(r.prize_id)
    if (!p) continue
    const k = kujiById.get(p.kuji_id)
    if (!k || r.recorded_at.slice(0, 10) < k.release_at) continue
    const s = series.get(r.prize_id) ?? new Map<number, number>()
    s.set(daysBetween(k.release_at, r.recorded_at), r.price)
    series.set(r.prize_id, s)
  }
  const changes: { change: number; prizeId: number }[] = []
  for (const [prizeId, s] of series) {
    if (!s.has(0) || !s.has(7)) continue
    const pts = [...s.keys()].filter(d => d <= 7).map(d => s.get(d)!)
    const lo = Math.min(...pts)
    const hi = Math.max(...pts)
    if (lo <= 0 || hi / lo >= 3) continue // app/lib/priceTrend.ts と同じ外れ値のガード
    changes.push({ change: s.get(7)! / s.get(0)! - 1, prizeId })
  }
  let priceWeek: KujiStats['priceWeek'] = null
  if (changes.length > 0) {
    const v = changes.map(c => c.change)
    const down = v.filter(x => x < -0.05 - 1e-12).length
    const up = v.filter(x => x >= 0.05 - 1e-12).length
    const flat = v.length - down - up
    const releaseMonths = changes.map(c => monthOf(kujiById.get(prizeById.get(c.prizeId)!.kuji_id)!.release_at)).sort((a, b) => a - b)
    priceWeek = {
      prizes: v.length,
      kuji: new Set(changes.map(c => prizeById.get(c.prizeId)!.kuji_id)).size,
      fromMonth: releaseMonths[0],
      toMonth: releaseMonths.at(-1)!,
      down: { label: '下がった（−5%より下）', count: down, pct: pct(down, v.length) },
      flat: { label: 'ほぼ同じ（±5%未満）', count: flat, pct: pct(flat, v.length) },
      up: { label: '上がった（+5%以上）', count: up, pct: pct(up, v.length) },
      medianTenths: pyRound((1 + median(v)) * 10),
    }
  }

  // ---- No.12 賞のランク別、相場は1回の値段の何倍か
  const cls = (g: string) => (g === 'ラストワン賞' ? 'ラストワン賞' : g === 'A賞' ? 'A賞' : ['B賞', 'C賞', 'D賞'].includes(g) ? 'B〜D賞' : 'E賞以下')
  const ratios = new Map<string, number[]>()
  for (const p of good) {
    const c = cls(p.grade)
    ratios.set(c, [...(ratios.get(c) ?? []), pyRound(p.auction_price_min! / kujiById.get(p.kuji_id)!.price, 3)])
  }
  const medianPrice = K.length ? median(K.map(k => k.price)) : 0
  const gradeRatio = {
    kuji: new Set(good.map(p => p.kuji_id)).size,
    prizes: good.length,
    fromMonth: goodFrom,
    medianPrice,
    rows: ['ラストワン賞', 'A賞', 'B〜D賞', 'E賞以下']
      .filter(c => (ratios.get(c) ?? []).length > 0)
      .map(c => {
        const m = pyRound(median(ratios.get(c)!), 1)
        return { label: c, prizes: ratios.get(c)!.length, medianRatio: m, yen: approxYen(m * medianPrice) }
      }),
  }

  return {
    asof,
    dataUpdatedAt,
    weekday,
    lastOneVsA,
    stores: { kuji: ks.length, fromMonth: storeFrom, rows: storeRows },
    convenience: { kuji: ks.length, fromMonth: storeFrom, rows: convRows, pairs: convPairs.slice(0, 4) },
    topPrize,
    priceWeek,
    gradeRatio,
  }
}
