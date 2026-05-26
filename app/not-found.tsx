import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <p className="text-xs font-bold tracking-widest text-red-500 mb-2">404</p>
      <h1 className="text-xl font-black text-gray-900 mb-2">ページが見つかりません</h1>
      <p className="text-sm text-gray-500 mb-8 leading-relaxed">
        お探しのページは削除されたか、URLが変更された可能性があります。
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-red-600 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-red-700 press"
      >
        ホームに戻る
      </Link>
    </main>
  )
}
