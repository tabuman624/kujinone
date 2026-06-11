import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import BottomNav from "./components/BottomNav";
import SideNav from "./components/SideNav";
import A8Script from "./components/A8Script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://kujinone.com'),
  title: "一番くじ 期待値計算ツール | くじのね",
  description: "一番くじ（いちばんくじ・1番くじ）の期待値を無料で計算。目当ての賞が当たるまでの平均費用を秒で算出。発売スケジュール・ヤフオク落札相場も確認できます。",
  openGraph: {
    title: "一番くじ 期待値計算ツール | くじのね",
    description: "一番くじ（いちばんくじ・1番くじ）の期待値を無料で計算。目当ての賞が当たるまでの平均費用を秒で算出。発売スケジュール・ヤフオク落札相場も確認できます。",
    url: "https://kujinone.com",
    siteName: "くじのね",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "くじのね" }],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "一番くじ 期待値計算ツール | くじのね",
    description: "一番くじ（いちばんくじ・1番くじ）の期待値を無料で計算。目当ての賞が当たるまでの平均費用を秒で算出。",
    images: ["/logo.png"],
  },
  verification: {
    google: "Sjo1gHcZIajNjfXIWQqWzgsLlCAT19ePlb3SnTbUwZ4",
  },
  other: {
    "google-adsense-account": "ca-pub-9006140407795306",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={geistSans.variable}>
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9006140407795306" crossOrigin="anonymous"></script>
      </head>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-88R7X8E7B0" strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-88R7X8E7B0');
      `}</Script>
      <body className="min-h-full bg-gray-100 text-gray-900">

        {/* PC: サイドナビ */}
        <SideNav />

        {/* コンテンツエリア */}
        <div className="md:pl-60">
          <div className="max-w-4xl mx-auto bg-white min-h-screen pb-24 md:pb-10 md:border-x md:border-gray-200 md:shadow-sm">
            {children}
            <p className="text-center text-xs text-gray-300 py-4 px-6">当サイトはアフィリエイト広告を利用しています</p>
          </div>
        </div>

        {/* スマホ: ボトムナビ */}
        <BottomNav />

        <A8Script />

      </body>
    </html>
  );
}
