'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type PickupKuji = {
  id: number
  title: string
  price: number
  banner_url: string | null
  image_url: string | null
  view_count: number
}

export default function PickupCarousel({ items }: { items: PickupKuji[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const i = slideRefs.current.findIndex(el => el === entry.target)
            if (i !== -1) setActive(i)
          }
        })
      },
      { root: track, threshold: 0.6 }
    )
    slideRefs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [items])

  const goTo = (i: number) => {
    slideRefs.current[i]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  return (
    <div className="mb-5">
      <p className="text-[11px] font-bold tracking-[0.18em] text-stone-400 mb-3">PICKUP · よく見られている順</p>
      <div
        ref={trackRef}
        className="flex gap-3 -mx-5 px-5 pb-2 overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((kuji, i) => (
          <Link
            key={kuji.id}
            ref={el => { slideRefs.current[i] = el }}
            href={`/kuji/${kuji.id}`}
            className="flex-shrink-0 w-[85%] snap-center bg-white border border-stone-200 rounded-xl overflow-hidden card-hover hover:border-shu hover:shadow-md press anim-fade-up group"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="relative w-full bg-shu-bg" style={{ aspectRatio: '3 / 2' }}>
              {(kuji.banner_url || kuji.image_url) ? (
                <Image
                  src={(kuji.banner_url || kuji.image_url) as string}
                  alt={kuji.title}
                  fill
                  className="object-cover"
                  sizes="85vw"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-shu" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
              )}
              <div className="absolute top-2 left-2">
                <span className="text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded-full backdrop-blur-sm">発売中</span>
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm font-bold text-stone-800 leading-snug line-clamp-2 group-hover:text-shu transition-colors">
                {kuji.title}
              </p>
              <p className="text-xs text-stone-400 mt-1">{kuji.price}円/回 ・ 閲覧数：{kuji.view_count}回</p>
            </div>
          </Link>
        ))}
      </div>
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-1">
          {items.map((kuji, i) => (
            <button
              key={kuji.id}
              type="button"
              aria-label={`${i + 1}枚目を表示`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-shu' : 'w-1.5 bg-stone-200'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
