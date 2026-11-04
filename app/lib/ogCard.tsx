import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// SNSで共有されたときの画像（1200×630）。記事（/blog/[slug]）と /data で使う。
//
// - ビルド時に1回だけ作る静的な画像（opengraph-image の既定）。ISR の再生成・Writes は増えない。
// - 公式の商品画像・キャラクターは使わない（BANDAI の規約）。文字とロゴだけで作る。
// - 色とロゴは /ogp.png（サイト共通の画像）と同じ。
// - フォントは常用の漢字に絞ったサブセット（assets/fonts/README.md）。

export const OG_SIZE = { width: 1200, height: 630 }

const INK = '#292524' // stone-800
const MUTED = '#78716C' // stone-500
const SHU = '#E14B36'
const BG = '#FAFAF9' // stone-50
const BAR = '#E7E5E4' // stone-200

// 下の飾りの棒（/ogp.png と同じ意匠）。高さは固定の並び（描くたびに変わらないように）。
const DECOR = [34, 52, 22, 60, 40, 48, 26, 56, 30, 44, 62, 28, 50, 36, 58, 24, 46, 54, 32]
const DECOR_SHU = 9

function titleSize(title: string): number {
  if (title.length <= 24) return 68
  if (title.length <= 34) return 60
  return 52
}

export async function renderOgCard({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  const font = await readFile(join(process.cwd(), 'assets/fonts/NotoSansJP-Bold-subset.ttf'))

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: BG,
          padding: '64px 72px 0',
          fontFamily: 'Noto Sans JP',
          color: INK,
        }}
      >
        {/* ロゴ（3本の棒）＋サイト名＋区分 */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 52, marginRight: 18 }}>
            <div style={{ width: 10, height: 26, borderRadius: 5, background: INK, marginRight: 6 }} />
            <div style={{ width: 10, height: 48, borderRadius: 5, background: SHU, marginRight: 6, alignSelf: 'flex-start' }} />
            <div style={{ width: 10, height: 36, borderRadius: 5, background: INK }} />
          </div>
          <div style={{ fontSize: 34, letterSpacing: 1 }}>くじのね</div>
          <div style={{ width: 2, height: 30, background: BAR, margin: '0 22px' }} />
          <div style={{ fontSize: 28, color: SHU }}>{eyebrow}</div>
        </div>

        {/* タイトル */}
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center', paddingBottom: 24 }}>
          <div style={{ fontSize: titleSize(title), lineHeight: 1.4, letterSpacing: 1 }}>{title}</div>
          {sub && <div style={{ fontSize: 30, color: MUTED, marginTop: 22, lineHeight: 1.5 }}>{sub}</div>}
        </div>

        {/* サイトのURLと、下の飾り */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 26, color: MUTED, paddingBottom: 34 }}>kujinone.com</div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            {DECOR.map((h, i) => (
              <div
                key={i}
                style={{ width: 12, height: h, marginLeft: 12, borderRadius: '6px 6px 0 0', background: i === DECOR_SHU ? SHU : BAR }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [{ name: 'Noto Sans JP', data: font, style: 'normal', weight: 700 }],
    },
  )
}
