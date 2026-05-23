'use client'
import Image from 'next/image'
import { useState } from 'react'

const gradeColors: { [key: string]: string } = {
  'A賞': 'bg-amber-100 text-amber-800',
  'B賞': 'bg-blue-100 text-blue-700',
  'C賞': 'bg-emerald-100 text-emerald-700',
  'D賞': 'bg-purple-100 text-purple-700',
  'E賞': 'bg-gray-100 text-gray-700',
}

type Prize = {
  id: string
  grade: string
  name: string
  total: number
  image_url: string | null
}

export default function PrizeList({ prizes }: { prizes: Prize[] }) {
  const [active, setActive] = useState<{ url: string; name: string } | null>(null)

  return (
    <>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {prizes.map((prize, i) => (
          <div
            key={prize.id}
            className={`flex items-center gap-3 px-4 py-3 anim-fade-up ${i !== prizes.length - 1 ? 'border-b border-gray-100' : ''}`}
            style={{ animationDelay: `${220 + i * 60}ms` }}
          >
            {prize.image_url ? (
              <button
                className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50 press"
                onClick={() => setActive({ url: prize.image_url!, name: prize.name })}
              >
                <Image src={prize.image_url} alt={prize.name} width={48} height={48} className="w-full h-full object-cover" />
              </button>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-50 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeColors[prize.grade] || 'bg-gray-100 text-gray-700'}`}>{prize.grade}</span>
              <p className="text-sm text-gray-800 font-medium mt-0.5 truncate">{prize.name}</p>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">{prize.total}本</span>
          </div>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center px-6"
          onClick={() => setActive(null)}
        >
          <div className="anim-pop">
            <Image
              src={active.url}
              alt={active.name}
              width={480}
              height={480}
              className="rounded-2xl object-contain"
              style={{ width: 'auto', height: 'auto', maxWidth: '85vw', maxHeight: '65vh' }}
            />
          </div>
          <p className="text-white text-sm font-bold mt-4 text-center">{active.name}</p>
          <p className="text-white/50 text-xs mt-2">タップして閉じる</p>
        </div>
      )}
    </>
  )
}
