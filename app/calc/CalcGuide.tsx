import Link from 'next/link'
import { expectedDraws } from '../lib/ev'

// 計算ページの説明（使い方・計算のしくみ・数字の見方）。サーバーで HTML に描く。
// 旧 /howto の3ステップもここに移した（/howto は /calc へ転送）。
// 例の数字は固定。くじのデータは使わないので、ページは静的なまま（ISR の再生成は増えない）。

const PRICE = 800

const yen = (n: number) => Math.round(n).toLocaleString('ja-JP')
// 計算結果の表示（CalcClient の formatTimes）と同じ形：整数ならそのまま、端数は小数第1位まで
const fmtTimes = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

const STEPS = [
  {
    title: 'くじを選ぶ',
    body: '発売スケジュールや各くじのページの「期待値を計算する」から開くと、1回の価格と賞の一覧が入った状態で始まります。くじを選ばずに、上の欄へ数字を入れて計算することもできます。',
  },
  {
    title: '目当ての賞と残り本数を入れる',
    body: '目当ての賞をタップして選び、店頭の半券表などで分かる残り本数を入れます。分からなければ初期値のままでも計算できます（総本数は80本の仮定、各賞は種類の数）。',
  },
  {
    title: '相場と見比べる',
    body: '結果の「期待金額」は、目当ての賞が出るまでに平均でかかる費用です。発売済みのくじなら、同じ画面にヤフオクとYahoo!ショッピングの相場も出ます。どちらも目安なので、両方を並べて考えてください。',
  },
]

const EXAMPLES = [
  { label: '80本の中にA賞が1本', total: 80, target: 1 },
  { label: '残り40本で、A賞がまだ1本残っている', total: 40, target: 1 },
  { label: '80本の中にA賞1本とB賞1本（どちらか出ればよい）', total: 80, target: 2 },
]

const RELATED = [
  { href: '/method', label: '期待値の計算方法（式と前提）' },
  { href: '/blog/kitaichi-toha', label: '一番くじの期待値とは？計算方法をわかりやすく解説' },
  { href: '/blog/ichiban-kuji-probability', label: '一番くじの確率の計算方法｜A賞〜D賞・ラストワン賞の当たる確率' },
]

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-shu font-bold mt-0.5">•</span>
      <span>{children}</span>
    </li>
  )
}

export default function CalcGuide() {
  return (
    <div className="px-6 pt-2 pb-10 space-y-8 text-sm text-stone-700 leading-relaxed border-t border-stone-100">
      <section id="howto" className="pt-6 scroll-mt-4">
        <p className="text-[11px] font-bold tracking-[0.18em] text-stone-400 mb-1">HOW TO USE</p>
        <h2 className="text-base font-black text-stone-800 mb-4">使い方</h2>
        <ol className="space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-start gap-3">
              <span
                className="w-7 h-7 rounded-full border-2 border-shu text-shu text-xs font-black flex items-center justify-center flex-shrink-0"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-stone-800 mb-1">{s.title}</h3>
                <p className="text-[13px] text-stone-600">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-base font-black text-stone-800 mb-3">計算のしくみ</h2>
        <p>
          平均回数は「（残りの総本数＋1）÷（目当ての賞の残り本数＋1）」で求めます。期待金額は、この回数に1回の価格をかけた金額です。1回{PRICE}円の場合の例です。
        </p>
        <div className="mt-3 border border-stone-200 rounded-xl overflow-hidden bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-stone-50 text-stone-500 text-xs">
              <tr>
                <th scope="col" className="text-left font-bold px-3 py-2">箱の状態</th>
                <th scope="col" className="text-right font-bold px-3 py-2 whitespace-nowrap">平均回数</th>
                <th scope="col" className="text-right font-bold px-3 py-2 whitespace-nowrap">期待金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {EXAMPLES.map((ex) => {
                const t = expectedDraws(ex.total, ex.target)
                return (
                  <tr key={ex.label}>
                    <td className="px-3 py-2.5">{ex.label}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-stone-800 whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {fmtTimes(t)}回
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      約{yen(t * PRICE)}円
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          「80本に1本だから80回」とならないのは、引いたくじが箱に戻らないからです。引くたびに残りが減っていくので、1本しかない賞なら、平均すると全体の半分ほどの回数で出ます。式のくわしい説明は
          <Link href="/method" className="text-shu hover:underline mx-1">期待値の計算方法</Link>
          にあります。
        </p>
      </section>

      <section>
        <h2 className="text-base font-black text-stone-800 mb-3">数字の見方</h2>
        <ul className="space-y-2">
          <Bullet>
            平均回数は目安です。80本に1本の賞は、1回目から80回目まで、どの回で出る確率も同じです。40回までに出る確率はちょうど半分（40÷80）で、残りの半分は41回目以降に出ます。
          </Bullet>
          <Bullet>
            総本数はメーカーから公表されていないため、初期値は80本と仮定しています。店頭で残り本数が分かれば、その数に書き換えてください。
          </Bullet>
          <Bullet>
            複数の賞を選ぶと、「どれか1つが出るまで」の平均回数になります。選んだ賞が全部そろうまでの回数ではありません。
          </Bullet>
          <Bullet>
            ラストワン賞は抽選ではなく、最後の1本を引いた人がもらえる賞なので、この計算には入りません。確実に取る費用は「残り本数×1回の価格」です（
            <Link href="/blog/ichiban-kuji-last-one" className="text-shu hover:underline">ラストワン賞の狙い方</Link>
            ）。
          </Bullet>
          <Bullet>
            一番くじONLINEで引く場合の手順や、1回の決済で引ける回数の上限・送料は
            <Link href="/blog/ichiban-kuji-online" className="text-shu hover:underline mx-1">一番くじオンラインのラストワン賞の狙い方と売り切れ対策</Link>
            にまとめています。
          </Bullet>
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-black text-stone-800 mb-2">あわせて読む</h2>
        <ul className="border-t border-stone-100">
          {RELATED.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className="flex items-center gap-2 py-2.5 border-b border-stone-100 text-[13px] text-stone-600 hover:text-shu transition-colors">
                <span className="text-shu">›</span>
                {r.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
