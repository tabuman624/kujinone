'use client'
import { useSyncExternalStore } from 'react'

// 「本日発売／明日発売／あと◯日」は閲覧者の時計で決まるため、ブラウザ側で計算する。
// サーバー描画（＝ISRで保存されるHTML）には出さないので、日をまたいでも再生成は不要。
const noopSubscribe = () => () => {}
function getTodayJst() {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
}

/** ブラウザでのJSTの今日。サーバー描画時とハイドレーション時は null */
export function useTodayJst(): string | null {
  return useSyncExternalStore(noopSubscribe, getTodayJst, () => null)
}

function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000)
}

/**
 * hero: カード画像の右上に重ねるバッジ（全ての日付で表示）
 * header: 日付見出し横のラベル（本日〜7日以内のみ表示）
 */
export default function RelDays({ date, variant }: { date: string; variant: 'hero' | 'header' }) {
  const today = useTodayJst()
  if (!today) return null
  const n = daysUntil(date, today)
  const label = n === 0 ? '本日発売' : n === 1 ? '明日発売' : n > 1 ? `あと${n}日` : '発売中'

  if (variant === 'hero') {
    return (
      <span className="absolute top-2 right-2 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded-full">
        {label}
      </span>
    )
  }
  if (n === 0) {
    return <span className="text-[10px] font-bold text-white bg-shu px-1.5 py-0.5 rounded-full">{label}</span>
  }
  if (n > 0 && n <= 7) return <span className="text-[10px] font-bold text-shu">{label}</span>
  if (n < 0) return <span className="text-[10px] font-bold text-stone-400">{label}</span>
  return null
}
