"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "../lib/supabase"

type Kuji = { id: number; title: string; price: number; total: number; release_at: string; image_url: string | null }
type Prize = {
  id: number; name: string; grade: string; total: number
  market_price?: number | null       // Yahoo Shopping（安定価格）
  auction_price_min?: number | null  // ヤフオク最安
  auction_price_max?: number | null  // ヤフオク最高
}
type PrizeWithInput = Prize & { checked: boolean; remaining: string }

const gradeColors: { [key: string]: string } = {
  "A賞": "bg-amber-100 text-amber-800",
  "B賞": "bg-blue-100 text-blue-700",
  "C賞": "bg-emerald-100 text-emerald-700",
  "D賞": "bg-purple-100 text-purple-700",
  "E賞": "bg-gray-100 text-gray-700",
}

function useCountUp(value: number | null | undefined, duration = 700) {
  const [n, setN] = useState(0)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef(0)
  useEffect(() => {
    if (value == null) { setN(0); return }
    fromRef.current = 0
    startRef.current = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const elapsed = t - (startRef.current || t)
      const p = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      const cur = fromRef.current + (value - fromRef.current) * eased
      setN(p === 1 ? value : cur)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return n
}

function Stepper({ value, onChange, min = 0, max = 999 }: { value: string; onChange: (v: string) => void; min?: number; max?: number }) {
  const v = parseInt(value)
  const n = isNaN(v) ? 0 : v
  const stop = (e: React.MouseEvent) => e.stopPropagation()
  return (
    <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5" onClick={stop}>
      <button onClick={(e) => { e.stopPropagation(); onChange(String(Math.max(min, n - 1))) }} className="w-7 h-7 rounded-md bg-white shadow-sm flex items-center justify-center text-gray-700 press text-base font-bold leading-none" style={{ paddingBottom: 2 }}>−</button>
      <input
        type="number"
        value={value}
        onClick={stop}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 text-center text-sm font-bold text-gray-900 bg-transparent outline-none"
        style={{ fontVariantNumeric: "tabular-nums" }}
      />
      <button onClick={(e) => { e.stopPropagation(); onChange(String(Math.min(max, n + 1))) }} className="w-7 h-7 rounded-md bg-white shadow-sm flex items-center justify-center text-gray-700 press text-base font-bold leading-none" style={{ paddingBottom: 2 }}>+</button>
    </div>
  )
}

function FormCard({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3.5">
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-xs font-bold text-gray-700">{label}</label>
        {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function EmptyResultCard({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center">
      <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 text-base">¥</div>
      <p className="text-sm font-semibold text-gray-700 mb-1">{title}</p>
      <p className="text-xs text-gray-400">{hint}</p>
    </div>
  )
}

function buildYahooAuctionUrl(kujiTitle: string, prize: PrizeWithInput): string {
  const titleCore = kujiTitle.replace(/^一番くじ\s*/, '').trim()
  const titlePrefix = titleCore.split(/\s+/)[0] ?? ''
  const keyword = [`一番くじ`, titlePrefix, prize.grade, prize.name.replace(/^[A-ZＡ-Ｚa-z\w]*賞\s*/, '').trim()].filter(Boolean).join(' ')
  return `https://auctions.yahoo.co.jp/search/search?p=${encodeURIComponent(keyword)}&va=${encodeURIComponent(keyword)}&istatus=1`
}

function buildYahooShoppingAffUrl(kujiTitle: string, prize: PrizeWithInput): string {
  const titleCore = kujiTitle.replace(/^一番くじ\s*/, '').trim()
  const titlePrefix = titleCore.split(/\s+/)[0] ?? ''
  const keyword = [`一番くじ`, titlePrefix, prize.grade, prize.name.replace(/^[A-ZＡ-Ｚa-z\w]*賞\s*/, '').trim()].filter(Boolean).join(' ')
  return `https://af.moshimo.com/af/c/click?a_id=5570999&p_id=1225&pc_id=1925&pl_id=18502&url=${encodeURIComponent(`https://shopping.yahoo.co.jp/search?p=${encodeURIComponent(keyword)}`)}`
}

function MarketPriceSection({ prizes, loading, kujiTitle }: { prizes: PrizeWithInput[], loading: boolean, kujiTitle: string }) {
  const hasAnyData = prizes.some(p => p.market_price != null || p.auction_price_min != null)
  const yahooAllUrl = `https://auctions.yahoo.co.jp/search/search?p=${encodeURIComponent('一番くじ ' + kujiTitle.replace(/^一番くじ\s*/, ''))}&istatus=1`

  if (prizes.length === 0) return null

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
      <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between border-b border-gray-200">
        <p className="text-xs font-black text-gray-700">二次流通の相場</p>
        <span className="text-[10px] text-gray-400 font-bold tracking-wider">MARKET PRICE</span>
      </div>
      {loading ? (
        <div className="px-4 py-4 flex items-center gap-2 text-gray-400">
          <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <span className="text-xs">相場を取得中...</span>
        </div>
      ) : hasAnyData ? (
        <div className="divide-y divide-gray-100">
          {prizes.map(prize => {
            const hasStable = prize.market_price != null
            const hasAuction = prize.auction_price_min != null && prize.auction_price_max != null
            if (!hasStable && !hasAuction) return null
            return (
              <div key={prize.id} className="px-4 py-3 flex items-start gap-3">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${gradeColors[prize.grade] || "bg-gray-100 text-gray-700"}`}>
                  {prize.grade}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate mb-1.5">{prize.name}</p>
                  <div className="flex flex-col gap-1">
                    {hasStable && (
                      <div className="flex items-center justify-between">
                        <a
                          href={buildYahooShoppingAffUrl(kujiTitle, prize)}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          className="text-[10px] text-blue-500 font-medium hover:underline"
                        >
                          Yahoo! Shoppingで探す【PR】
                        </a>
                        <span className="text-sm font-black text-emerald-600">
                          ¥{prize.market_price!.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {hasAuction && (
                      <div className="flex items-center justify-between">
                        <a
                          href={buildYahooAuctionUrl(kujiTitle, prize)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-500 font-medium hover:underline"
                        >
                          ヤフオクで探す
                        </a>
                        <span className="text-sm font-black text-blue-600">
                          ¥{prize.auction_price_min!.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="px-4 py-3 text-xs text-gray-400">相場データが見つかりませんでした</div>
      )}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-[10px] text-gray-400">参考：ヤフオク落札相場・Yahooショッピング</p>
      </div>
    </div>
  )
}

function ResultCard({ expected, times, detail }: { expected: number; times: number; detail: string }) {
  const animExp = useCountUp(expected, 800)
  const animTimes = useCountUp(times, 700)
  return (
    <div className="border-2 border-gray-900 rounded-xl overflow-hidden mb-6 anim-result">
      <div className="bg-gray-900 px-4 py-2.5 flex items-center justify-between">
        <p className="text-sm font-black text-white">計算結果</p>
        <span className="text-xs text-red-400 font-bold tracking-wider">RESULT</span>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-baseline mb-3">
          <div>
            <p className="text-xs text-gray-400 mb-1">期待金額</p>
            <p className="text-3xl font-black text-gray-900" style={{ fontVariantNumeric: "tabular-nums" }}>
              {Math.round(animExp).toLocaleString()}<span className="text-sm text-gray-500 ml-1">円</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-1">平均回数</p>
            <p className="text-3xl font-black text-gray-900" style={{ fontVariantNumeric: "tabular-nums" }}>
              {Math.round(animTimes)}<span className="text-sm text-gray-500 ml-1">回</span>
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400">{detail}</p>
      </div>
    </div>
  )
}

function AffiliateLinks({ title }: { title: string }) {
  useEffect(() => {
    (window as any).a8linkmgr?.({ config_id: 'xLVEUKG6qLmgP54TvR6L' })
  }, [title])

  const links = [
    { href: `https://px.a8.net/svt/ejp?a8mat=4B3MEQ+DIF6SA+5LNQ+5YJRM&a8ejpredirect=${encodeURIComponent(`https://jp.mercari.com/search?keyword=${encodeURIComponent(title)}`)}`, label: "メルカリで相場を見る【PR】", sub: "出品価格を確認", color: "bg-red-50 border-red-200 text-red-600", rel: "noopener noreferrer nofollow sponsored" },
    { href: `https://affiliate.suruga-ya.jp/modules/af/af_jump.php?user_id=5303&goods_url=https%3A%2F%2Fwww.suruga-ya.jp%2Fsearch%3Fsearch_word%3D${encodeURIComponent(title)}`, label: "駿河屋で相場を見る【PR】", sub: "在庫あり最安値を確認", color: "bg-blue-50 border-blue-200 text-blue-600", rel: "nofollow noopener noreferrer" },
    { href: `https://af.moshimo.com/af/c/click?a_id=5570999&p_id=1225&pc_id=1925&pl_id=18502&url=${encodeURIComponent(`https://shopping.yahoo.co.jp/search?p=${encodeURIComponent(title)}`)}`, label: "Yahoo!ショッピングで見る【PR】", sub: "新品・中古の価格を確認", color: "bg-amber-50 border-amber-200 text-amber-600", rel: "noopener noreferrer sponsored" },
    { href: `https://af.moshimo.com/af/c/click?a_id=5570988&p_id=54&pc_id=54&pl_id=621&url=${encodeURIComponent(`https://search.rakuten.co.jp/search/mall/${encodeURIComponent(title)}`)}`, label: "楽天市場で見る【PR】", sub: "ポイントを使ってお得に購入", color: "bg-pink-50 border-pink-200 text-pink-600", rel: "noopener noreferrer sponsored" },
  ]
  const surugaKaitoriUrl = `https://affiliate.suruga-ya.jp/modules/af/af_jump.php?user_id=5303&goods_url=${encodeURIComponent('https://www.suruga-ya.jp/man/kaitori/kaitoritop.html')}`
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-black text-gray-900 mb-3 anim-fade-up">相場を確認・購入する</h2>
      {links.map((link, i) => (
        <a key={link.href} href={link.href} target="_blank" rel={link.rel} className={`flex items-center gap-3 p-3 border rounded-xl ${link.color} press anim-fade-up`} style={{ animationDelay: `${100 + i * 90}ms` }}>
          <div className="flex-1">
            <p className="text-sm font-bold">{link.label}</p>
            <p className="text-xs opacity-70">{link.sub}</p>
          </div>
          <span className="text-sm">↗</span>
        </a>
      ))}
      <div className="pt-1">
        <h2 className="text-sm font-black text-gray-900 mb-3 anim-fade-up" style={{ animationDelay: '460ms' }}>賞品を売る</h2>
        <a href={surugaKaitoriUrl} target="_blank" rel="nofollow noopener noreferrer" className="flex items-center gap-3 p-3 border rounded-xl bg-green-50 border-green-200 text-green-700 press anim-fade-up" style={{ animationDelay: '500ms' }}>
          <div className="flex-1">
            <p className="text-sm font-bold">駿河屋に売る【PR】</p>
            <p className="text-xs opacity-70">宅配・出張買取に対応、査定無料</p>
          </div>
          <span className="text-sm">↗</span>
        </a>
      </div>
    </div>
  )
}

function KujiIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  )
}

function CalcContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const kujiId = searchParams.get("kuji_id")

  const [kuji, setKuji] = useState<Kuji | null>(null)
  const [prizes, setPrizes] = useState<PrizeWithInput[]>([])
  const [marketLoading, setMarketLoading] = useState(false)

  const [manualTotal, setManualTotal] = useState("")
  const [manualTarget, setManualTarget] = useState("")
  const [manualPrice, setManualPrice] = useState("800")

  useEffect(() => {
    if (!kujiId) return
    const fetchData = async () => {
      const { data: k } = await supabase.from("kuji").select("*").eq("id", kujiId).single()
      const { data: p } = await supabase.from("prizes").select("*").eq("kuji_id", kujiId).order("sort_order", { ascending: true })
      if (k) setKuji(k)
      if (p) {
        setPrizes(p.map((prize: Prize) => ({ ...prize, checked: false, remaining: String(prize.total) })))

        // 相場をリアルタイム取得（並列・非同期）
        setMarketLoading(true)
        fetch(`/api/market-price?kuji_id=${kujiId}`)
          .then(r => r.json())
          .then(({ prices }) => {
            if (!Array.isArray(prices)) return
            type PriceEntry = { id: number; stable_price: number | null; auction_min: number | null; auction_max: number | null }
            const priceMap: Record<number, PriceEntry> = {}
            for (const entry of prices as PriceEntry[]) priceMap[entry.id] = entry
            setPrizes(prev => prev.map(prize =>
              priceMap[prize.id] !== undefined
                ? {
                    ...prize,
                    market_price: priceMap[prize.id].stable_price,
                    auction_price_min: priceMap[prize.id].auction_min,
                    auction_price_max: priceMap[prize.id].auction_max,
                  }
                : prize
            ))
          })
          .catch(() => {})
          .finally(() => setMarketLoading(false))
      }
    }
    fetchData()
  }, [kujiId])

  const toggleCheck = (id: number) => setPrizes(prev => prev.map(p => {
    if (p.id !== id) return p
    // チェックON時のみトラッキング（24時間クールダウン・fire and forget）
    if (!p.checked) {
      const key = `ki_${id}`
      const last = localStorage.getItem(key)
      const now = Date.now()
      if (!last || now - parseInt(last) >= 86_400_000) {
        fetch('/api/track-interest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prize_id: id }),
        })
        localStorage.setItem(key, String(now))
      }
    }
    return { ...p, checked: !p.checked }
  }))
  const updateRemaining = (id: number, value: string) => setPrizes(prev => prev.map(p => p.id === id ? { ...p, remaining: value } : p))

  const totalRemaining = useMemo(() =>
    prizes.reduce((sum, p) => { const v = parseInt(p.remaining); return sum + (isNaN(v) ? p.total : v) }, 0),
    [prizes]
  )

  const liveResult = useMemo(() => {
    if (!kuji) return null
    const checked = prizes.filter(p => p.checked)
    if (checked.length === 0) return null
    const targetCount = checked.reduce((sum, p) => { const v = parseInt(p.remaining); return sum + (isNaN(v) ? p.total : v) }, 0)
    if (targetCount === 0 || totalRemaining === 0) return null
    const times = Math.round((totalRemaining + 1) / (targetCount + 1))
    const expected = times * kuji.price
    return { expected, times, targetCount, gradeStr: checked.map(p => p.grade).join("・") }
  }, [prizes, kuji, totalRemaining])

  const manualLive = useMemo(() => {
    const total = parseInt(manualTotal)
    const target = parseInt(manualTarget)
    const price = parseInt(manualPrice)
    if (isNaN(total) || isNaN(target) || isNaN(price) || target <= 0 || total <= 0 || target > total) return null
    const times = Math.round((total + 1) / (target + 1))
    const expected = times * price
    return { expected, times, total, target, price }
  }, [manualTotal, manualTarget, manualPrice])

  // ----- With selected kuji -----
  if (kujiId && kuji) {
    const selectedCount = prizes.filter(p => p.checked).length
    return (
      <main style={{ background: "#fafafa" }}>
        <div className="px-6 pt-6 pb-5 bg-gray-900">
          <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 mb-3 press">← 戻る</button>
          <p className="text-[11px] font-bold tracking-[0.18em] text-gray-400 mb-1">CALCULATOR</p>
          <h1 className="text-2xl font-black text-white">期待値を計算</h1>
        </div>

        <div className="px-5 pt-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 anim-fade-up" style={{ animationDelay: "40ms" }}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 bg-red-50 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
                {kuji.image_url
                  ? <Image src={kuji.image_url} alt={kuji.title} width={44} height={44} className="w-full h-full object-cover" unoptimized />
                  : <KujiIcon />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 tracking-[0.15em] font-bold mb-1">SELECTED</p>
                <p className="text-sm font-black text-gray-900 leading-snug mb-2">{kuji.title}</p>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="text-[11px] bg-gray-900 text-white px-2 py-0.5 rounded-full font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>{kuji.price}円/回</span>
                  {kuji.total > 0 && <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full" style={{ fontVariantNumeric: "tabular-nums" }}>全{kuji.total}本</span>}
                </div>
                <div className="mt-3 bg-gray-800 rounded-xl px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-bold tracking-wide">総残数</span>
                  <span className="text-2xl font-black text-white" style={{ fontVariantNumeric: "tabular-nums" }}>{totalRemaining}<span className="text-sm font-normal text-gray-400 ml-1">本</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pt-6">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-black text-gray-900">狙いの賞を選ぶ</h2>
            <span className="text-[11px] text-gray-400">{selectedCount > 0 ? `${selectedCount}賞選択中` : "タップで選択"}</span>
          </div>

          <div className="space-y-2">
            {prizes.map((prize, i) => (
              <button
                key={prize.id}
                onClick={() => toggleCheck(prize.id)}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl press anim-fade-up transition-all ${prize.checked ? "bg-red-50" : "bg-white border border-gray-200"}`}
                style={{ animationDelay: `${80 + i * 50}ms`, boxShadow: prize.checked ? "0 0 0 2px #dc2626 inset" : undefined }}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${prize.checked ? "bg-red-600 scale-100" : "bg-white border-2 border-gray-300 scale-95"}`}>
                  {prize.checked && <span className="text-white text-[11px] font-black">✓</span>}
                </div>
                <span className={`text-xs font-bold w-8 text-center py-1 rounded ${gradeColors[prize.grade] || "bg-gray-100 text-gray-700"}`}>{prize.grade}</span>
                <span className="flex-1 text-[13px] text-gray-900 font-medium truncate">{prize.name}</span>
                <Stepper value={prize.remaining} onChange={v => updateRemaining(prize.id, v)} min={0} max={kuji.total || 999} />
              </button>
            ))}
          </div>

          <div className="mt-3 mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <span className="text-amber-500 text-sm flex-shrink-0 mt-0.5">⚠️</span>
            <p className="text-[11px] text-amber-800 font-medium leading-relaxed">店頭で残数を確認し、各賞の数値を更新してください。<br />初期値は賞の種類数（目安）です。</p>
          </div>
        </div>

        <div className="px-5 pb-6">
          {liveResult ? (
            <>
              <ResultCard
                expected={liveResult.expected}
                times={liveResult.times}
                detail={`残数${totalRemaining}本 / ${liveResult.gradeStr}${liveResult.targetCount}本 / ${kuji.price}円 × ${liveResult.times}回`}
              />
              <MarketPriceSection prizes={prizes.filter(p => p.checked)} loading={marketLoading} kujiTitle={kuji.title} />
              <AffiliateLinks title={kuji.title} />
            </>
          ) : (
            <EmptyResultCard title="狙いの賞を選んでみよう" hint="タップした瞬間に期待値が計算されます" />
          )}
        </div>
      </main>
    )
  }

  // ----- Manual mode -----
  const totalPresets = [30, 50, 80, 100]
  const pricePresets = [700, 800, 850, 1000]
  return (
    <main style={{ background: "#fafafa" }}>
      <div className="px-6 pt-6 pb-5 bg-gray-900">
        <p className="text-[11px] font-bold tracking-[0.18em] text-gray-400 mb-1">CALCULATOR</p>
        <h1 className="text-2xl font-black text-white">期待値を計算</h1>
        <p className="text-xs text-gray-400 mt-1">情報を入力して期待値を算出</p>
      </div>

      <div className="px-5 pt-5">
        <Link href="/schedule" className="w-full text-left flex items-center gap-3 p-3.5 bg-white border border-red-100 rounded-xl mb-5 press anim-fade-up" style={{ animationDelay: "40ms" }}>
          <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#dc2626">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-red-600">スケジュールから選ぶと自動入力</p>
            <p className="text-[11px] text-gray-500 mt-0.5">賞情報がそのまま入力されます</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <div className="space-y-3 mb-5">
          <FormCard label="くじの総本数" hint="箱に入っている全本数">
            <div className="flex items-center justify-between gap-3">
              <Stepper value={manualTotal} onChange={setManualTotal} min={1} max={300} />
              <div className="flex gap-1.5 flex-wrap">
                {totalPresets.map(n => (
                  <button key={n} onClick={() => setManualTotal(String(n))} className={`text-[11px] px-2.5 py-1 rounded-full press transition-colors ${manualTotal === String(n) ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`} style={{ fontVariantNumeric: "tabular-nums" }}>{n}本</button>
                ))}
              </div>
            </div>
          </FormCard>

          <FormCard label="目当ての賞の本数" hint="狙う賞の合計">
            <Stepper value={manualTarget} onChange={setManualTarget} min={1} max={50} />
          </FormCard>

          <FormCard label="1回の金額" hint="くじ一回あたり">
            <div className="flex gap-1.5 flex-wrap">
              {pricePresets.map(p => (
                <button key={p} onClick={() => setManualPrice(String(p))} className={`text-xs px-3 py-1.5 rounded-full font-semibold press transition-colors ${manualPrice === String(p) ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"}`} style={{ fontVariantNumeric: "tabular-nums" }}>{p}円</button>
              ))}
            </div>
          </FormCard>
        </div>
      </div>

      <div className="px-5 pb-6">
        {manualLive ? (
          <>
            <ResultCard
              expected={manualLive.expected}
              times={manualLive.times}
              detail={`総数${manualLive.total}本 / 目当ての賞${manualLive.target}本 / ${manualLive.price}円 × ${manualLive.times}回`}
            />
            <AffiliateLinks title="一番くじ 景品" />
          </>
        ) : (
          <EmptyResultCard title="情報を入力してみよう" hint="入力すると期待値がリアルタイムで表示されます" />
        )}
      </div>
    </main>
  )
}

export default function CalcPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-400">読み込み中...</div>}>
      <CalcContent />
    </Suspense>
  )
}
