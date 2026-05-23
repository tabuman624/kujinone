import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default async function SchedulePage() {
  const { data: kujiList } = await supabase
    .from('kuji')
    .select('*')
    .eq('is_active', true)
    .order('release_at', { ascending: true })

  return (
    <main>
      <div className="bg-gray-900 px-6 py-8 text-white">
        <p className="text-xs font-bold tracking-widest text-gray-400 mb-1">SCHEDULE</p>
        <h1 className="text-xl font-black">発売スケジュール</h1>
      </div>
      <div className="px-5 py-6 space-y-3">
        {kujiList?.map((kuji, i) => (
          <Link
            key={kuji.id}
            href={`/kuji/${kuji.id}`}
            className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl card-hover hover:border-red-300 hover:shadow-md press anim-fade-up"
            style={{ animationDelay: `${60 + i * 60}ms` }}
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
    </main>
  )
}
