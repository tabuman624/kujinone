import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import BottomNav from "./components/BottomNav";
import SideNav from "./components/SideNav";
import A8Script from "./components/A8Script";
import XIcon from "./components/XIcon";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://kujinone.com'),
  title: {
    default: "一番くじ 期待値計算ツール | くじのね",
    template: "%s | くじのね",
  },
  description: "一番くじ（いちばんくじ・1番くじ）の期待値を無料で計算。目当ての賞が当たるまでの平均費用を秒で算出。発売スケジュール・ヤフオク落札相場も確認できます。",
  openGraph: {
    title: "くじのね | 一番くじ期待値計算",
    description: "一番くじの期待値を無料で計算。狙う賞を選ぶだけ、登録不要です。",
    url: "https://kujinone.com",
    siteName: "くじのね",
    images: [{ url: "/ogp.png", width: 1200, height: 630, alt: "くじのね" }],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "くじのね | 一番くじ期待値計算",
    description: "一番くじの期待値を無料で計算。狙う賞を選ぶだけ、登録不要です。",
    images: ["/ogp.png"],
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
  },
  verification: {
    google: "Sjo1gHcZIajNjfXIWQqWzgsLlCAT19ePlb3SnTbUwZ4",
  },
  other: {
    "google-adsense-account": "ca-pub-9006140407795306",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'くじのね',
  url: 'https://kujinone.com',
  logo: 'https://kujinone.com/logo.png',
  description: '一番くじの期待値計算・発売スケジュール・相場情報サイト',
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'くじのね',
  alternateName: '一番くじ 期待値計算ツール',
  url: 'https://kujinone.com',
  description: '一番くじ（いちばんくじ・1番くじ）の期待値を無料で計算。目当ての賞が当たるまでの平均費用を秒で算出できます。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={geistSans.variable}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9006140407795306" crossOrigin="anonymous"></script>
      </head>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-88R7X8E7B0" strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-88R7X8E7B0');
      `}</Script>
      <body className="min-h-full bg-stone-100 text-stone-800">

        {/* PC: サイドナビ */}
        <SideNav />

        {/* コンテンツエリア */}
        <div className="md:pl-60">
          <div className="max-w-4xl mx-auto bg-white min-h-screen pb-24 md:pb-10 md:border-x md:border-stone-200 md:shadow-sm">
            {children}
            <div className="flex flex-col items-center gap-2 py-4 px-6">
              <a
                href="https://x.com/kujinone"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="くじのねのXアカウント"
                className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-shu transition-colors"
              >
                <XIcon className="w-3.5 h-3.5" />
                <span>X (旧Twitter)</span>
              </a>
              <p className="text-center text-xs text-stone-300">当サイトはアフィリエイト広告を利用しています</p>
            </div>
          </div>
        </div>

        {/* スマホ: ボトムナビ */}
        <BottomNav />

        <A8Script />

      </body>
    </html>
  );
}
