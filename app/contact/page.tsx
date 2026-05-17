"use client"

import { useState } from "react"

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus("sending")
    const form = e.currentTarget
    const res = await fetch("https://formspree.io/f/xpqnayba", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new FormData(form),
    })
    if (res.ok) {
      setStatus("done")
      form.reset()
    } else {
      setStatus("error")
    }
  }

  return (
    <main>
      <div className="bg-gray-900 px-6 py-8 text-white">
        <p className="text-xs font-bold tracking-widest text-gray-400 mb-1">CONTACT</p>
        <h1 className="text-xl font-black">お問い合わせ</h1>
      </div>

      <div className="px-6 py-8">
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          くじのねへのご意見・ご要望・不具合報告などはこちらからお送りください。
        </p>

        {status === "done" ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-sm font-bold text-green-700">送信完了しました！</p>
            <p className="text-xs text-green-600 mt-1">お問い合わせありがとうございます。</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">お名前</label>
              <input
                type="text"
                name="name"
                required
                placeholder="山田 太郎"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-400 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">メールアドレス</label>
              <input
                type="email"
                name="email"
                required
                placeholder="example@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-400 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">お問い合わせ内容</label>
              <textarea
                name="message"
                required
                rows={5}
                placeholder="お問い合わせ内容をご記入ください"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-400 transition-colors resize-none"
              />
            </div>

            {status === "error" && (
              <p className="text-xs text-red-500">送信に失敗しました。もう一度お試しください。</p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full py-3.5 bg-red-600 text-white text-sm font-bold rounded-xl press disabled:opacity-50"
              style={{ boxShadow: "0 6px 16px rgba(220,38,38,0.35)" }}
            >
              {status === "sending" ? "送信中..." : "送信する"}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
