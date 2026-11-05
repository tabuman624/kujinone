import CalcClient from './CalcClient'
import CalcGuide from './CalcGuide'

// 計算の画面（ブラウザで動く部分）と、説明（サーバーで HTML に描く部分）を並べる。
// 以前はページ全体がブラウザ描画で、HTML には「読み込み中...」しか入っていなかった。
export default function CalcPage() {
  return (
    <main style={{ background: '#fafafa' }}>
      <CalcClient />
      <CalcGuide />
    </main>
  )
}
