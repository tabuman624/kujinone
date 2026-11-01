'use client'
import { useState } from 'react'
import { STORE_FILTERS } from './stores'
import { useTodayJst } from './RelDays'

// 月タブと店舗フィルタ。一覧（カード）はサーバーで描画し、ここでは表示/非表示を
// CSSで切り替えるだけにする。HTMLには全件が残るのでクロールに影響せず、
// クライアントに渡すデータも月の一覧だけで済む（RSCペイロードを小さく保つ）。
export default function ScheduleControls({
  months,
  defaultMonth,
}: {
  months: { key: string; label: string }[]
  defaultMonth: string
}) {
  const [month, setMonth] = useState(defaultMonth)
  const [store, setStore] = useState('')
  const today = useTodayJst()

  const css = [
    `[data-msec]:not([data-msec="${month}"]){display:none}`,
    store && `.kcard:not([data-stores~="${store}"]){display:none}`,
    store && `.dgroup:not(:has(.kcard[data-stores~="${store}"])){display:none}`,
    store && `.calday[data-stores]:not([data-stores~="${store}"]){opacity:.35}`,
    store && `[data-msec]:not(:has(.kcard[data-stores~="${store}"])) .nomatch{display:block}`,
    today && `.calday[data-date="${today}"]{outline:2px solid #292524;outline-offset:-2px}`,
  ].filter(Boolean).join('\n')

  return (
    <>
      <style>{css}</style>
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 shadow-sm">
        <div className="flex items-center px-2 overflow-x-auto select-none" style={{ scrollbarWidth: 'none' }}>
          {months.map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMonth(m.key)}
              className={`flex-shrink-0 px-3.5 py-3 text-sm font-bold border-b-2 -mb-px transition-colors ${
                month === m.key ? 'text-shu border-shu' : 'text-stone-400 border-transparent hover:text-stone-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 pt-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {[{ key: '', label: 'すべて' }, ...STORE_FILTERS].map(f => (
            <button
              key={f.key || 'all'}
              type="button"
              onClick={() => setStore(f.key)}
              className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                store === f.key ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
