'use client'

import { useEffect, useRef, useState } from 'react'
import { kujiGoogleHref, kujiIcsHref } from '../lib/ics'

// カレンダーに登録するリンク（2026-11-15）。押されたら GA4 に calendar_add を送る（link_label でどのリンクかを区別）。
// 効果は、この押された数と、予定のメモのリンクから来た訪問（utm_source=calendar）で見る。
function track(label: string) {
  window.gtag?.('event', 'calendar_add', { link_label: label, page_path: window.location.pathname })
}

export function CalendarLink({
  href,
  label,
  className,
  newTab = false,
  children,
}: {
  href: string
  label: string
  className?: string
  newTab?: boolean
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      rel="nofollow noopener noreferrer"
      {...(newTab ? { target: '_blank' } : {})}
      className={className}
      onClick={() => track(label)}
    >
      {children}
    </a>
  )
}

export function CopyCalendarUrl({ url, label, className }: { url: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        track(label)
        navigator.clipboard?.writeText(url).then(() => setCopied(true), () => {})
      }}
    >
      {copied ? 'コピーしました' : 'URLをコピー'}
    </button>
  )
}

// スケジュールの各くじに付ける「カレンダー」ボタン。押すと iPhone・Mac か Google かを選ぶ小さなメニューが開く。
// 全部のくじを購読したい人は少なく、気になるくじだけを入れたい人が多いと考えて、くじごとに置く（2026-11-15）。
export function AddToCalendar({ kujiId, label }: { kujiId: number; label: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  const item = 'block px-3 py-2 text-xs font-bold text-stone-700 hover:bg-shu-bg hover:text-shu rounded-lg whitespace-nowrap'
  return (
    <div ref={ref} className="relative h-full">
      <button
        type="button"
        aria-expanded={open}
        aria-label="発売日をカレンダーに追加"
        onClick={() => setOpen(v => !v)}
        className="h-full w-12 flex flex-col items-center justify-center gap-0.5 text-stone-400 hover:text-shu press"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zm7 7v5m-2.5-2.5h5" />
        </svg>
        <span className="text-[9px] font-bold leading-none">追加</span>
      </button>
      {open && (
        <div className="absolute right-1 top-full mt-1 z-20 bg-white border border-stone-200 rounded-xl shadow-lg p-1">
          <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold text-stone-400">発売日をカレンダーに追加</p>
          <CalendarLink href={kujiIcsHref(kujiId)} label={`${label}_iPhone`} className={item}>iPhone・Macのカレンダー</CalendarLink>
          <CalendarLink href={kujiGoogleHref(kujiId)} label={`${label}_Google`} className={item} newTab>Googleカレンダー</CalendarLink>
        </div>
      )}
    </div>
  )
}
