'use client'

import { useState, type ReactNode } from 'react'

// 中身は常にDOMへレンダリングし、見た目だけCSSクラスで開閉する。
// クローラーが読む初期HTMLに全文を残すため（条件付きレンダリングでの出し分けは禁止）。
export default function CollapsibleSection({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-4">
      <div className={open ? '' : 'hidden'}>{children}</div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-stone-500 py-2.5 border border-stone-200 rounded-xl press"
      >
        {open ? '閉じる' : label}
        <span className="text-[10px]">{open ? '▲' : '▼'}</span>
      </button>
    </div>
  )
}
