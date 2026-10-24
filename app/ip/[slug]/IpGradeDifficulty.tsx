import { supabase } from '../../lib/supabase'
import type { IpKuji } from '../../lib/ipGroups'

const TOP_GRADES = ['A賞', 'B賞', 'C賞']

// prizes.total（全N種）だけを使い、相場・total_countに一切依存しない。
// 未発売弾でも賞構成が登録済みなら成立するため、空白になりやすい弾も埋められる。
export default async function IpGradeDifficulty({ kujiList }: { kujiList: IpKuji[] }) {
  if (kujiList.length === 0) return null

  const kujiIds = kujiList.map(k => k.id)
  const { data: prizes } = await supabase
    .from('prizes')
    .select('kuji_id, grade, total')
    .in('kuji_id', kujiIds)
    .in('grade', TOP_GRADES)

  if (!prizes || prizes.length === 0) return null

  const byGrade = new Map<string, { kujiId: number; total: number }[]>()
  for (const p of prizes) {
    if (p.total == null || p.total <= 0) continue
    const arr = byGrade.get(p.grade) ?? []
    arr.push({ kujiId: p.kuji_id, total: p.total })
    byGrade.set(p.grade, arr)
  }

  // 発売順（古い→新しい）。release_at未定（発売日未定）は末尾に寄せる。
  const order = [...kujiList].sort((a, b) => (a.release_at ?? '9999-99').localeCompare(b.release_at ?? '9999-99'))

  const sections = TOP_GRADES
    .map(grade => {
      const entries = order
        .map(k => {
          const match = byGrade.get(grade)?.find(e => e.kujiId === k.id)
          return match ? { kuji: k, total: match.total } : null
        })
        .filter((e): e is NonNullable<typeof e> => e !== null)
      return entries.length >= 2 ? { grade, entries } : null
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)

  if (sections.length === 0) return null

  return (
    <div className="px-5 pb-6">
      <h2 className="text-xs font-black text-stone-400 tracking-wider mb-3">狙いの意匠が当たる確率（弾ごと）</h2>
      <p className="text-sm text-stone-600 mb-3 leading-relaxed">
        同じ賞でも複数の意匠（デザイン）に分かれていることが多く、その賞が当たっても狙いの意匠が出るとは限りません。意匠数は弾によって変わるため、確率も弾ごとに異なります。
      </p>
      <div className="space-y-4">
        {sections.map(({ grade, entries }) => (
          <div key={grade}>
            <p className="text-xs font-bold text-stone-700 mb-2">{grade}の意匠数</p>
            <div className="bg-stone-50 border border-stone-200 rounded-xl overflow-hidden">
              {entries.map((e, i) => (
                <div
                  key={e.kuji.id}
                  className={`flex items-center justify-between gap-3 px-3 py-2 ${i !== entries.length - 1 ? 'border-b border-stone-200' : ''}`}
                >
                  <span className="text-xs text-stone-600 truncate flex-1 min-w-0">{e.kuji.title}</span>
                  <span className="text-xs font-bold text-stone-800 flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    全{e.total}種 → 1/{e.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
