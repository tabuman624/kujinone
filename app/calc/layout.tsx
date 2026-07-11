import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '一番くじ 期待値計算ツール【無料】 | くじのね',
  description: '一番くじの期待値を無料で計算。残り枚数を入力するだけで「A賞が当たるまで平均何回・何円かかるか」が即わかる。スマホ対応。',
  alternates: { canonical: '/calc' },
}

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: '一番くじ 期待値計算ツール',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  url: 'https://kujinone.com/calc',
  description: '一番くじの期待値を無料で計算。残り枚数を入力するだけで「A賞が当たるまで平均何回・何円かかるか」が即わかる。スマホ対応。',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
  publisher: { '@type': 'Organization', name: 'くじのね', url: 'https://kujinone.com' },
}

export default function CalcLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
      {children}
    </>
  )
}
