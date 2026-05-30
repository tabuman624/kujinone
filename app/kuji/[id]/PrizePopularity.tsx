import { supabase } from '../../lib/supabase'

type Prize = { id: number; name: string; grade: string }

export default async function PrizePopularity({ kujiId, prizes }: { kujiId: number; prizes: Prize[] }) {
  if (!prizes.length) return null

  const [{ data: interests }, { data: viewData }] = await Promise.all([
    supabase
      .from('prize_interest')
      .select('prize_id, check_count')
      .in('prize_id', prizes.map(p => p.id)),
    supabase
      .from('kuji_views')
      .select('view_count')
      .eq('kuji_id', kujiId)
      .single(),
  ])

  const viewCount = viewData?.view_count ?? 0
  const hasInterest = interests?.some(i => (i.check_count as number) > 0)

  if (!hasInterest && viewCount === 0) return null

  const interestMap = Object.fromEntries(
    (interests ?? []).map(i => [i.prize_id, i.check_count as number])
  )
  const maxCount = Math.max(0, ...(Object.values(interestMap) as number[]))

  return (
    <div className="mb-6 anim-fade-up">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xs font-black text-gray-400 tracking-wider">注目度 / POPULARITY</h2>
        {viewCount > 0 && (
          <span className="text-xs text-gray-400">{viewCount.toLocaleString()}人が閲覧</span>
        )}
      </div>
      {hasInterest && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          {prizes.map(prize => {
            const count = interestMap[prize.id] ?? 0
            const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
            return (
              <div key={prize.id}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-black text-gray-400 w-6 flex-shrink-0">{prize.grade}</span>
                  <span className="text-[11px] font-semibold text-gray-700 flex-1 truncate">{prize.name}</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
