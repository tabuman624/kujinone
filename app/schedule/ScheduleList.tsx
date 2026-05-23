'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

type Kuji = {
  id: string
  title: string
  release_at: string
  image_url: string | null
  price: number
  total: number | null
}

function formatMonthLabel(yyyymm: string) {
  const [, month] = yyyymm.split('-')
  return `${parseInt(month)}月`
}

export default function ScheduleList({ kujiList }: { kujiList: Kuji[] }) {
  const grouped: Record<string, Kuji[]> = {}
  for (const kuji of kujiList) {
    const key = kuji.release_at?.slice(0, 7) ?? 'unknown'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(kuji)
  }
  const months = Object.keys(grouped).sort()

  const currentMonth = new Date().toISOString().slice(0, 7)
  const defaultMonth = months.includes(currentMonth) ? currentMonth : (months[0] ?? '')
  const [selected, setSelected] = useState(defaultMonth)

  const items = grouped[selected] ?? []

  return (
    <>
      {/* 月タブ */}
      <div className="flex overflow-x-auto border-b border-gray-200 px-4 gap-1 sticky top-0 bg-white z-10">
        {months.map(month => (
          <button
            key={month}
            onClick={() => setSelected(month)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
              selected === month
                ? 'text-red-600 border-red-600'
                : 'text-gray-400 border-transparent hover:text-gray-700'
            }`}
          >
            {formatMonthLabel(month)}
          </button>
        ))}
      </div>

      {/* くじ一覧 */}
      <div className="px-5 py-5 space-y-3">
        {items.map((kuji, i) => (
          <Link
            key={kuji.id}
            href={`/kuji/${kuji.id}`}
            className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl card-hover hover:border-red-300 hover:shadow-md press anim-fade-up"
            style={{ animationDelay: `${40 + i * 40}ms` }}
          >
            <div className="w-12 h-12 bg-red-50 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
              {kuji.image_url ? (
                <Image src={kuji.image_url} alt={kuji.title} width={48} height={48} className="w-full h-full object-cover" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">{kuji.release_at}発売</span>
              <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{kuji.title}</p>
              <p className="text-xs text-gray-500">{kuji.price}円/回{kuji.total ? ` · 全${kuji.total}本` : ''}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </>
  )
}
