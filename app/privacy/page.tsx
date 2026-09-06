import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
  description: 'くじのねにおける個人情報の取り扱い、アクセス解析・広告配信に関するプライバシーポリシーです。',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <main>
      <div className="bg-stone-800 px-6 py-8 text-white">
        <p className="text-xs font-bold tracking-widest text-stone-400 mb-1">PRIVACY</p>
        <h1 className="text-xl font-black">プライバシーポリシー</h1>
      </div>
      <div className="px-6 py-8 space-y-6 text-sm text-stone-700 leading-relaxed">
        <section>
          <h2 className="text-base font-black text-stone-800 mb-2">収集する情報</h2>
          <p>当サイトでは、アクセス解析のためにGoogle Analyticsを使用しており、Cookie等により閲覧情報を収集することがあります。個人を特定する情報は収集しません。</p>
        </section>
        <section>
          <h2 className="text-base font-black text-stone-800 mb-2">アフィリエイトについて</h2>
          <p>当サイトはメルカリ（A8.net）・駿河屋・Yahoo!ショッピング・楽天市場等のアフィリエイトプログラムに参加しています。リンク経由で購入された場合、当サイトに報酬が発生することがあります。</p>
        </section>
        <section>
          <h2 className="text-base font-black text-stone-800 mb-2">Cookieについて</h2>
          <p>当サイトはCookieを使用することがあります。ブラウザの設定によりCookieを無効にすることができますが、一部機能が制限される場合があります。</p>
        </section>
        <section>
          <h2 className="text-base font-black text-stone-800 mb-2">お問い合わせ</h2>
          <p>プライバシーに関するご質問は、サイト運営者までお問い合わせください。</p>
        </section>
        <p className="text-xs text-stone-400 pt-4">制定日：2026年5月1日</p>
      </div>
    </main>
  )
}
