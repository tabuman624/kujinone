import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { todayJst, jaMonthDay } from '../lib/jst'
import { computeKujiStats, pyRound, type Bar, type StatKuji, type StatPrize, type StatPricePoint } from '../lib/kujiStats'
import { expectedDraws } from '../lib/ev'
import { OG_BASE, OG_IMAGE, X_HANDLE, X_URL } from '../lib/siteMeta'

// くじのねが集めたデータの集計（X の水曜の豆知識と同じ計算。app/lib/kujiStats.ts）。
// 再生成は1日1回。日付の切り替わり後の更新は /api/cron/revalidate-changed（毎日12時台）が行う。
export const revalidate = 86400

const title = 'データで見る一番くじ｜発売曜日・販売店・相場の集計'
const description =
  '一番くじの発売日・販売店・中古相場を集計。発売が多い曜日、コンビニ別の取り扱い、ラストワン賞とA賞の相場の比較、発売から1週間の相場の変化などを、毎日のデータから自動で更新しています。'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/data' },
  openGraph: { title: `${title} | くじのね`, description, url: 'https://kujinone.com/data', ...OG_BASE, images: [OG_IMAGE] },
}

// X の投稿の返信リンクがこの id を指す（tools/x-posts/build.py の TRIVIA_ANCHORS）。変えるときは両方直す。
const SECTIONS = [
  { id: 'weekday', label: '何曜日に発売される？' },
  { id: 'last-one', label: 'ラストワン賞はA賞より高い？' },
  { id: 'stores', label: 'どこで買える？' },
  { id: 'convenience', label: 'そのコンビニでしか買えないくじ' },
  { id: 'top-prize', label: 'いちばん相場が高い賞は？' },
  { id: 'draws', label: 'A賞が出るまでの平均回数' },
  { id: 'price-week', label: '発売1週間の相場の変化' },
  { id: 'grade-ratio', label: '賞のランク別の相場' },
]

const PAGE_SIZE = 1000

// PostgREST は1回に1,000行までしか返さないため、id 順に区切って全件取る。
// 取得に失敗したら throw する（ISR では前回の内容が残る。0件のまま「0本」と出さないため）。
async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from(table).select(columns).order('id', { ascending: true }).range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`/data: ${table}の取得に失敗しました: ${error.message}`)
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}

const num = { fontVariantNumeric: 'tabular-nums' as const }

/** 'YYYY-MM' → '2026年5月' */
const ym = (s: string) => `${s.slice(0, 4)}年${Number(s.slice(5, 7))}月`

function monthRange(from: string, to: string): string {
  return from.slice(0, 4) === to.slice(0, 4) ? `${ym(from)}〜${Number(to.slice(5, 7))}月` : `${ym(from)}〜${ym(to)}`
}

// 横棒。数字は必ず文字でも出す（色や長さだけで読ませない）。長さは一番多い行を基準にする。
function Bars({ rows, highlight, unit = '本', labelWidth = 'w-24' }: { rows: Bar[]; highlight?: string; unit?: string; labelWidth?: string }) {
  const max = Math.max(1, ...rows.map(r => r.count))
  return (
    <div className="space-y-1.5" style={num}>
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-2">
          <span className={`text-xs text-stone-600 ${labelWidth} flex-shrink-0`}>{r.label}</span>
          <div className="flex-1 h-3 bg-stone-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${r.label === highlight ? 'bg-shu' : 'bg-stone-400'}`} style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
          <span className="text-xs text-stone-700 w-24 text-right flex-shrink-0">
            {r.pct}%（{r.count}{unit}）
          </span>
        </div>
      ))}
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 border-t border-stone-200 pt-6">
      <h2 className="text-base font-black text-stone-800 mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-stone-700 leading-relaxed">{children}</div>
    </section>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-stone-400 leading-relaxed">{children}</p>
}

function More({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <p>
      <Link href={href} className="text-shu text-xs font-bold hover:underline">
        {children} →
      </Link>
    </p>
  )
}

export default async function DataPage() {
  const [kuji, prizes, history] = await Promise.all([
    fetchAll<StatKuji>('kuji', 'id, price, release_at, available_stores, updated_at'),
    fetchAll<StatPrize>('prizes', 'id, kuji_id, grade, auction_price_min, auction_price_updated_at'),
    fetchAll<StatPricePoint>('price_history', 'id, prize_id, price, recorded_at'),
  ])
  const s = computeKujiStats(kuji, prizes, history, todayJst())

  const wd = s.weekday
  const day = (label: string) => wd.days.find(d => d.label === label)!
  const weekRange = monthRange(wd.from, wd.to)
  const storePct = (label: string) => s.stores.rows.find(r => r.label === label)?.pct ?? 0
  const topA = s.topPrize.rows.find(r => r.label === 'A賞')!
  const lo = s.lastOneVsA
  const pw = s.priceWeek
  const gr = s.gradeRatio
  const unitPrice = Math.trunc(gr.medianPrice)

  return (
    <main>
      <div className="bg-stone-800 px-6 py-8 text-white">
        <p className="text-xs font-bold tracking-widest text-stone-400 mb-1">DATA</p>
        <h1 className="text-xl font-black">データで見る一番くじ</h1>
      </div>

      <div className="px-6 py-8 space-y-8">
        <div className="space-y-3 text-sm text-stone-700 leading-relaxed">
          <p>
            くじのねが毎日集めている一番くじのデータ（発売日・販売店・賞の構成・中古相場）を集計したページです。数字は、データの更新にあわせて毎日自動で計算し直しています。
          </p>
          {s.dataUpdatedAt && <p className="text-xs text-stone-500">データの最終更新：{jaMonthDay(s.dataUpdatedAt)}</p>}
          <nav aria-label="このページの目次" className="bg-stone-50 border border-stone-200 rounded-xl p-4">
            <p className="text-xs font-bold text-stone-500 mb-2">目次</p>
            <ol className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {SECTIONS.map((sec, i) => (
                <li key={sec.id}>
                  <a href={`#${sec.id}`} className="text-stone-700 hover:text-shu">
                    {i + 1}. {sec.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <Section id="weekday" title="一番くじは何曜日に発売される？">
          <p style={num}>
            {weekRange}に発売された（予定を含む）一番くじ{wd.total}本を発売日の曜日で数えると、土曜日が{day('土曜日').count}本（{day('土曜日').pct}%）、金曜日が{day('金曜日').count}本（{day('金曜日').pct}%）でした。月〜木曜日の発売は、合わせて{wd.monThuTenths > 0 ? `${wd.monThuTenths}割ほど` : '1割未満'}です。
          </p>
          <Bars rows={wd.days} highlight={[...wd.days].sort((a, b) => b.count - a.count)[0]?.label} />
          <Note>{weekRange}の発売日{wd.hasFuture ? `（${Number(wd.to.slice(5, 7))}月は発表済みの予定）` : ''}で数えています。</Note>
          <More href="/schedule">今月・来月の発売日は発売スケジュールで</More>
        </Section>

        <Section id="last-one" title="ラストワン賞は、A賞より相場が高い？">
          <p style={num}>
            A賞とラストワン賞の両方に落札相場があるくじ{lo.kuji}本のうち、{lo.loHigherPct}%（{lo.loHigher}本）でラストワン賞の方が高い相場でした。ラストワン賞の相場がA賞の何倍かを並べると、真ん中の値は{pyRound(lo.medianRatio, 1).toFixed(1)}倍です。
          </p>
          <Bars
            rows={[
              { label: 'ラストワン賞が高い', count: lo.loHigher, pct: lo.loHigherPct },
              { label: 'A賞が高い', count: lo.aHigher, pct: lo.kuji ? pyRound((lo.aHigher / lo.kuji) * 100) : 0 },
              { label: '同じ', count: lo.same, pct: lo.kuji ? pyRound((lo.same / lo.kuji) * 100) : 0 },
            ]}
            highlight="ラストワン賞が高い"
            labelWidth="w-28"
          />
          <Note>{ym(lo.fromMonth)}以降に発売し、発売から7日以上たったくじ。相場はヤフオクの落札価格の中央値です。</Note>
          <More href="/blog/ichiban-kuji-last-one">ラストワン賞の狙い方と、費用の目安</More>
        </Section>

        <Section id="stores" title="一番くじはどこで買える？">
          <p style={num}>
            {ym(s.stores.fromMonth)}以降に発売された{s.stores.kuji}本のうち、一番くじONLINEで買えるくじは{storePct('一番くじONLINE')}%、どこかのコンビニで買えるくじは{storePct('コンビニ（どこか1つ）')}%でした。
          </p>
          <Bars rows={s.stores.rows} highlight="一番くじONLINE" labelWidth="w-32" />
          <Note>販売店は一番くじ公式サイトの掲載どおりに数えています。店舗によっては取り扱いがない場合があります。</Note>
          <More href="/schedule">くじごとの販売店は発売スケジュールから</More>
        </Section>

        <Section id="convenience" title="そのコンビニでしか買えないくじは？">
          <p style={num}>
            同じ{s.convenience.kuji}本を、買えるコンビニごとに数えました。「そのコンビニだけ」は、ほかのコンビニの掲載がないくじです（公式ショップや一番くじONLINE、書店などで買える場合はあります）。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={num}>
              <thead>
                <tr className="text-stone-400 border-b border-stone-200">
                  <th className="text-left font-bold py-1.5 pr-2">コンビニ</th>
                  <th className="text-right font-bold py-1.5 pr-2">買えるくじ</th>
                  <th className="text-right font-bold py-1.5">そのコンビニだけ</th>
                </tr>
              </thead>
              <tbody>
                {s.convenience.rows.map(r => (
                  <tr key={r.label} className="border-b border-stone-100 last:border-0">
                    <td className="py-1.5 pr-2 text-stone-700">{r.label}</td>
                    <td className="py-1.5 pr-2 text-right font-bold text-stone-800">{r.total}本</td>
                    <td className="py-1.5 text-right text-stone-600">{r.only}本</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {s.convenience.pairs.length > 0 && (
            <p className="text-xs text-stone-600" style={num}>
              よく一緒に扱われる組み合わせ：{s.convenience.pairs.map(p => `${p.label} ${p.count}本`).join('、')}
            </p>
          )}
          <Note>販売店は一番くじ公式サイトの掲載どおりに数えています。</Note>
          <More href="/store">取扱店から一番くじを探す</More>
        </Section>

        <Section id="top-prize" title="いちばん相場が高い賞は、A賞？">
          <p style={num}>
            賞が4つ以上あり、A賞の相場が取れているくじ{s.topPrize.kuji}本で、相場がいちばん高かった賞（ラストワン賞を除く）を数えると、A賞だったのは{topA.pct}%でした。ほかのくじでは、B賞から下のどれかの賞がいちばん高い相場でした。
          </p>
          <Bars rows={s.topPrize.rows} highlight="A賞" />
          <Note>{ym(s.topPrize.fromMonth)}以降に発売し、発売から7日以上たったくじ。相場はヤフオクの落札価格の中央値です。</Note>
          <More href="/ranking/wanted">人気の賞と今の相場は、欲しい賞ランキングで</More>
        </Section>

        <Section id="draws" title="A賞が出るまで、平均で何回引く？">
          <p>
            1本しかないA賞が出るまでの平均回数は、（総本数＋1）÷（A賞の本数＋1）で計算できます。総本数を80本と仮定すると、81÷2で平均40.5回です。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={num}>
              <thead>
                <tr className="text-stone-400 border-b border-stone-200">
                  <th className="text-left font-bold py-1.5 pr-2">A賞の本数（総本数80本と仮定）</th>
                  <th className="text-right font-bold py-1.5">平均</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map(k => {
                  const avg = expectedDraws(80, k)
                  return (
                    <tr key={k} className="border-b border-stone-100 last:border-0">
                      <td className="py-1.5 pr-2 text-stone-700">{k}本</td>
                      <td className="py-1.5 text-right font-bold text-stone-800">{Number.isInteger(avg) ? avg : avg.toFixed(1)}回目</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Note>
            1ロットの総本数はメーカーから公表されていないため、80本は仮定です。引いたくじは箱に戻らないので、80÷1ではなく（80＋1）÷（1＋1）になります。
          </Note>
          <More href="/calc">賞と残り本数を選んで計算する</More>
        </Section>

        <Section id="price-week" title="発売から1週間で、相場は上がる？下がる？">
          {pw ? (
            <>
              <p style={num}>
                発売日と7日後の両方に落札相場の記録がある{pw.prizes}賞（くじ{pw.kuji}本）を比べると、{pw.down.pct}%の賞で、7日後の相場が発売日より下がっていました。真ん中の賞で、発売日の約{pw.medianTenths}割です。
              </p>
              <Bars rows={[pw.down, pw.flat, pw.up]} highlight={pw.down.label} unit="賞" labelWidth="w-36" />
              <Note>
                {pw.fromMonth === pw.toMonth ? `${pw.fromMonth}月` : `${pw.fromMonth}〜${pw.toMonth}月`}
                に発売したくじの賞。発売日から7日後までに、最高値が最安値の3倍以上になった賞は、別の商品の混入などの可能性があるため除いています。
              </Note>
            </>
          ) : (
            <p>発売日と7日後の両方に相場の記録がある賞が、まだありません。</p>
          )}
          <More href="/blog/ichiban-kuji-price-drop">相場が下がりやすいタイミング</More>
        </Section>

        <Section id="grade-ratio" title="賞のランク別、相場は1回の値段の何倍？">
          <p>落札相場を、そのくじの1回の価格で割った倍率を、賞のランク別に並べました（それぞれ真ん中の値）。</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={num}>
              <thead>
                <tr className="text-stone-400 border-b border-stone-200">
                  <th className="text-left font-bold py-1.5 pr-2">賞</th>
                  <th className="text-right font-bold py-1.5 pr-2">1回の何倍</th>
                  <th className="text-right font-bold py-1.5 pr-2">1回{unitPrice}円なら</th>
                  <th className="text-right font-bold py-1.5">賞の数</th>
                </tr>
              </thead>
              <tbody>
                {gr.rows.map(r => (
                  <tr key={r.label} className="border-b border-stone-100 last:border-0">
                    <td className="py-1.5 pr-2 text-stone-700 whitespace-nowrap">{r.label}</td>
                    <td className="py-1.5 pr-2 text-right font-bold text-stone-800">{r.medianRatio}倍</td>
                    <td className="py-1.5 pr-2 text-right text-stone-600 whitespace-nowrap">約{r.yen.toLocaleString()}円</td>
                    <td className="py-1.5 text-right text-stone-500">{r.prizes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Note>
            {ym(gr.fromMonth)}以降に発売し、発売から7日以上たったくじ{gr.kuji}本・{gr.prizes}賞。「1回{unitPrice}円なら」は、掲載しているくじの1回の価格の真ん中の値で換算した目安です。
          </Note>
          <More href="/calc">狙いの賞が出るまでの平均回数は、計算ページで</More>
        </Section>

        <section className="border-t border-stone-200 pt-6">
          <h2 className="text-base font-black text-stone-800 mb-3">集計の方法</h2>
          <ul className="space-y-2 text-xs text-stone-600 leading-relaxed">
            <li>・発売日・価格・販売店・賞の構成は、一番くじ公式サイトの掲載情報を毎日取得したものです。</li>
            <li>・相場は、ヤフオクの落札価格の中央値です。発売日以降に取得したもので、発売から7日以上たったくじの賞だけを使っています。</li>
            <li>・割合は四捨五入しているため、合計が100%にならないことがあります。</li>
            <li>
              ・
              <a href={X_URL} target="_blank" rel="noopener noreferrer" className="text-shu hover:underline">
                X（{X_HANDLE}）
              </a>
              の豆知識の投稿は、このページと同じ計算の、投稿した時点の数字です。
            </li>
          </ul>
          <p className="mt-3 text-xs">
            <Link href="/method" className="text-shu hover:underline">
              期待値の計算方法とデータの出典
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
