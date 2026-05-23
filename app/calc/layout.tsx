import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '一番くじ 期待値計算 | くじのね',
  description: '一番くじの期待値を無料で計算。賞の残数を入力するだけで、目当ての賞が当たるまでの平均費用がわかります。',
}

export default function CalcLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
