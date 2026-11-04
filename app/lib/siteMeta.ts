// SNSで共有されたときの表示（og:* / twitter:*）の共通部分。
//
// layout の openGraph は、ページ側で openGraph を書くと丸ごと置き換わる（Next.js のメタデータは浅いマージ）。
// そのためページ側では OG_BASE を展開し、サイト名・言語・画像が抜けないようにする（2026-11、/ip で og:image が無かった）。
// twitter:* は layout の card・site だけを持ち、タイトル・説明・画像はページの openGraph から Next.js が自動で補う。

export const X_HANDLE = '@kujinone'
export const X_URL = 'https://x.com/kujinone'

export const OG_IMAGE = { url: '/ogp.png', width: 1200, height: 630, alt: 'くじのね' }

export const OG_BASE = {
  siteName: 'くじのね',
  locale: 'ja_JP',
  type: 'website' as const,
}
