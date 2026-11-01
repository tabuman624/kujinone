import Image from 'next/image'
import Link from 'next/link'
import { MAX_STORE_CHIPS, storeFilterKeys, storeLabels } from './stores'
import { shortDate, weekdayLabel } from '../lib/jst'

export type ScheduleKuji = {
  id: number
  title: string
  release_at: string | null
  price: number
  image_url: string | null
  banner_url: string | null
  available_stores?: string[] | null
}

// 画像はDB上ほぼ全て横長バナー（3:2）なので、正方形に切らず3:2のまま出す。
// showStores: 発売前の一覧では「どの店で引けるか」を出す。発売済み一覧ではページを軽くするため出さない。
export default function KujiCard({
  kuji,
  showDate = false,
  showStores = true,
}: {
  kuji: ScheduleKuji
  showDate?: boolean
  showStores?: boolean
}) {
  const stores = Array.isArray(kuji.available_stores) ? kuji.available_stores : []
  const labels = showStores ? storeLabels(stores) : []
  const img = kuji.banner_url || kuji.image_url

  return (
    <Link
      href={`/kuji/${kuji.id}`}
      className="kcard flex gap-3 p-3 bg-white border border-stone-200 rounded-xl hover:border-shu transition-colors press"
      data-stores={showStores ? storeFilterKeys(stores).join(' ') : undefined}
    >
      <div className="w-[104px] flex-shrink-0 rounded-lg overflow-hidden bg-shu-bg" style={{ aspectRatio: '3 / 2' }}>
        {img && (
          <Image src={img} alt={kuji.title} width={208} height={139} className="w-full h-full object-cover" loading="lazy" unoptimized />
        )}
      </div>
      <div className="flex-1 min-w-0">
        {showDate && kuji.release_at && (
          <p className="text-[11px] font-bold text-stone-500">
            {shortDate(kuji.release_at)}({weekdayLabel(kuji.release_at)})発売
          </p>
        )}
        <p className="text-[13px] font-bold text-stone-800 leading-snug line-clamp-2">{kuji.title}</p>
        <p className="text-xs text-stone-500 mt-0.5">
          <b className="text-stone-700">{kuji.price.toLocaleString()}円</b>/回
        </p>
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {labels.slice(0, MAX_STORE_CHIPS).map(l => (
              <span key={l} className="text-[10px] leading-none px-1.5 py-[3px] rounded-full bg-stone-100 text-stone-600 font-semibold">{l}</span>
            ))}
            {labels.length > MAX_STORE_CHIPS && (
              <span className="text-[10px] leading-none px-1 py-[3px] text-stone-400 font-semibold">他{labels.length - MAX_STORE_CHIPS}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
