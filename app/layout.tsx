import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import BottomNav from "./components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "くじのね | 一番くじ期待値計算",
  description: "一番くじの期待値を計算して、賢くくじを引こう",
  verification: {
    google: "Sjo1gHcZIajNjfXIWQqWzgsLlCAT19ePlb3SnTbUwZ4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={geistSans.variable}>
      <body className="min-h-full bg-gray-100 text-gray-900">

        {/* PC: サイドナビ */}
        <div className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-60 md:flex-col md:bg-white md:border-r md:border-gray-200 md:shadow-sm">
          <div className="px-5 py-5 border-b border-gray-100">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="くじのね" className="w-8 h-8 rounded-lg object-cover" />
              <div>
                <div className="text-sm font-black text-gray-900 leading-tight">くじのね</div>
                <div className="text-xs text-gray-400 leading-tight">期待値計算ツール</div>
              </div>
            </Link>
          </div>

          <nav className="flex flex-col gap-0.5 px-3 py-4 flex-1">
            {[
              { href: "/", label: "ホーム", sub: "HOME", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
              { href: "/schedule", label: "発売スケジュール", sub: "SCHEDULE", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
              { href: "/calc", label: "期待値を計算する", sub: "CALCULATOR", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
              { href: "/blog", label: "コラム", sub: "COLUMN", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" },
            ].map(item => (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors group">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0 group-hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                <div>
                  <div className="text-xs font-semibold leading-tight">{item.label}</div>
                  <div className="text-xs text-gray-400 leading-tight font-medium tracking-wider">{item.sub}</div>
                </div>
              </Link>
            ))}
          </nav>

          <div className="px-5 py-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {[
                { href: "/howto", label: "使い方" },
                { href: "/terms", label: "利用規約" },
                { href: "/privacy", label: "プライバシー" },
                { href: "/contact", label: "お問い合わせ" },
              ].map(item => (
                <Link key={item.href} href={item.href} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  {item.label}
                </Link>
              ))}
            </div>
            <p className="text-xs text-gray-300 mt-2">© 2026 くじのね</p>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="md:pl-60">
          <div className="max-w-4xl mx-auto bg-white min-h-screen pb-24 md:pb-10 md:border-x md:border-gray-200 md:shadow-sm">
            {children}
          </div>
        </div>

        {/* スマホ: ボトムナビ */}
        <BottomNav />

      </body>
    </html>
  );
}
