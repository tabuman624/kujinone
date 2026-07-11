import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'お問い合わせ | くじのね',
  description: 'くじのねへのお問い合わせはこちらから。',
  alternates: { canonical: '/contact' },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
