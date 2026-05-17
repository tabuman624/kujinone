import Link from 'next/link'

const steps = [
  { num: '01', title: 'スケジュールから選ぶ', desc: '気になるくじをタップして賞の内容と本数を確認します。', tip: '「期待値を計算する」ボタンで賞情報が自動で引き継がれます。' },
  { num: '02', title: '残数をカウント', desc: '店頭でくじ箱の残り本数を入力します。残数なしでも計算可能です。', tip: '残数を入れるほど精度の高い期待値が計算できます。' },
  { num: '03', title: '相場と比較する', desc: 'メルカリ・駿河屋の相場と期待金額を見比べて、引くか買うかを判断。', tip: '期待値より相場が安ければフリマで買うのがお得です。' },
]

export default function HowtoPage() {
  return (
    <main style={{ background: '#fafafa' }}>
      <div className="px-6 pt-6 pb-6 bg-gray-900">
        <p className="text-[11px] font-bold tracking-[0.18em] text-gray-400 mb-1">HOW TO USE</p>
        <h1 className="text-2xl font-black text-white">使い方</h1>
        <p className="text-xs text-gray-400 mt-1">3ステップで賢くくじを楽しむ</p>
      </div>

      <div className="px-6 pt-8 pb-4">
        <div style={{ position: 'relative' }}>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 23,
              top: 28,
              bottom: 28,
              width: 2,
              background: 'linear-gradient(180deg, #dc2626 0%, #fca5a5 60%, #e5e7eb 100%)',
              borderRadius: 2,
            }}
          />
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="anim-fade-up"
              style={{ position: 'relative', paddingLeft: 68, paddingBottom: i === steps.length - 1 ? 4 : 36, animationDelay: `${80 + i * 110}ms` }}
            >
              <div
                className="anim-pop"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: '#fff',
                  border: '2px solid #dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  fontWeight: 900,
                  fontSize: 15,
                  letterSpacing: '0.02em',
                  fontVariantNumeric: 'tabular-nums',
                  boxShadow: '0 6px 14px rgba(220,38,38,0.18)',
                  animationDelay: `${80 + i * 110}ms`,
                }}
              >
                {step.num}
              </div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-red-500 mb-1">STEP {step.num}</p>
              <h2 className="text-base font-black text-gray-900 leading-snug mb-2" style={{ textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{step.title}</h2>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-3" style={{ textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{step.desc}</p>
              <div className="flex items-start gap-2 bg-white border border-red-100 rounded-xl px-3 py-2.5">
                <span className="text-red-500 text-xs mt-0.5">💡</span>
                <p className="text-[11.5px] text-gray-700 leading-relaxed flex-1" style={{ textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{step.tip}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pt-2 pb-8">
        <Link href="/schedule" className="flex items-center justify-center gap-2 w-full py-3.5 bg-red-600 text-white text-sm font-bold rounded-xl press" style={{ boxShadow: '0 6px 16px rgba(220,38,38,0.35)' }}>
          さっそく使ってみる →
        </Link>
      </div>
    </main>
  )
}
