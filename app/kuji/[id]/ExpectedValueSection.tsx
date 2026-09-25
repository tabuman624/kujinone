type Prize = { grade: string; name: string }

const ASSUMED_COUNTS = [1, 2, 3]
const TOP_GRADES = ['A賞', 'B賞', 'C賞']

// 負の超幾何分布: 総本数Nの中に目標がk本のとき、1本目が出るまでの平均回数
// N/k ではなく (N+1)/(k+1)。非復元抽出（開けたら減る）の期待値はこちらが正しい。
function averageDrawsUntilHit(totalCount: number, k: number) {
  return (totalCount + 1) / (k + 1)
}

export default function ExpectedValueSection({
  price,
  totalCount,
  totalCountSource,
  prizes,
}: {
  price: number
  totalCount: number | null
  totalCountSource: 'measured' | 'default' | null
  prizes: Prize[]
}) {
  if (!totalCount || totalCount <= 0) return null

  const lotTotal = price * totalCount
  const topPrizes = prizes.filter(p => TOP_GRADES.includes(p.grade))

  return (
    <div className="mb-6 anim-fade-up">
      <h2 className="text-xs font-black text-stone-400 tracking-wider mb-3">期待値 / EXPECTED VALUE</h2>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-center">
          <p className="text-[10px] text-stone-400 font-bold mb-1">1回の価格</p>
          <p className="text-base font-black text-stone-800" style={{ fontVariantNumeric: 'tabular-nums' }}>{price.toLocaleString()}円</p>
        </div>
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-center">
          <p className="text-[10px] text-stone-400 font-bold mb-1">総本数</p>
          <p className="text-base font-black text-stone-800" style={{ fontVariantNumeric: 'tabular-nums' }}>{totalCount.toLocaleString()}本</p>
        </div>
        <div className="bg-stone-50 border border-shu-bg rounded-xl p-3 text-center">
          <p className="text-[10px] text-stone-400 font-bold mb-1">ロット総額</p>
          <p className="text-base font-black text-shu" style={{ fontVariantNumeric: 'tabular-nums' }}>{lotTotal.toLocaleString()}円</p>
        </div>
      </div>

      {topPrizes.length > 0 && (
        <details className="mb-3 group">
          <summary className="text-xs font-bold text-stone-500 py-1 cursor-pointer select-none flex items-center gap-1">
            本数別の平均回数を見る
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-stone-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="space-y-4 mt-3">
            {topPrizes.map(prize => (
              <div key={`${prize.grade}-${prize.name}`}>
                <p className="text-xs font-bold text-stone-700 mb-2">【{prize.grade}】{prize.name}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                      <tr className="text-stone-400 border-b border-stone-200">
                        <th className="text-left font-bold py-1.5 pr-2">本数の仮定</th>
                        <th className="text-right font-bold py-1.5 pr-2">平均</th>
                        <th className="text-right font-bold py-1.5">目安金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ASSUMED_COUNTS.map(k => {
                        const avg = averageDrawsUntilHit(totalCount, k)
                        const cost = Math.round(avg * price)
                        return (
                          <tr key={k} className="border-b border-stone-100 last:border-0">
                            <td className="py-1.5 pr-2 text-stone-600 whitespace-nowrap">{prize.grade}が{k}本の場合</td>
                            <td className="py-1.5 pr-2 text-right font-bold text-stone-800 whitespace-nowrap">平均 {avg.toFixed(1)}回目</td>
                            <td className="py-1.5 text-right text-stone-500 whitespace-nowrap">約{cost.toLocaleString()}円</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      <p className="text-xs text-gray-400 leading-relaxed mt-2">
        {totalCountSource === 'measured'
          ? `※ 総本数${totalCount}本はロット販売情報にもとづく実測値です。各賞の本数は非公開のため、本数別の目安を掲載しています。`
          : `※ 一番くじの総本数はメーカー非公開のため、${totalCount}本と仮定して計算しています。各賞の本数も公開されていないため、本数別の目安を掲載しています。実際の本数は店頭の半券表でご確認ください。`}
      </p>
    </div>
  )
}
