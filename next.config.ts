import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [new URL('https://assets.1kuji.com/**')],
  },
  async redirects() {
    return [
      // /today（今日・今週発売）は /schedule の「次に発売」・日付見出しに統合した（2026-11）。
      {
        source: '/today',
        destination: '/schedule',
        permanent: true,
      },
      // ichiban-kuji-conveni.mdとほぼ同内容でキーワードが競合していたため統合。
      // 既存の被リンク・検索順位をconveni.mdに引き継ぐための301。
      {
        source: '/blog/ichiban-kuji-store',
        destination: '/blog/ichiban-kuji-conveni',
        permanent: true,
      },
      // SEO監査v2 Step 6 Batch 1: 表示0の低価値記事を統合（2026-11）。必要な内容だけ移植したうえで統合先へ恒久リダイレクト。
      // 基礎（beginners の店頭での買い方・FAQ を toha に移植。premium・prizes は移植なし）
      { source: '/blog/ichiban-kuji-beginners', destination: '/blog/ichiban-kuji-toha', permanent: true },
      { source: '/blog/ichiban-kuji-premium', destination: '/blog/ichiban-kuji-toha', permanent: true },
      { source: '/blog/ichiban-kuji-prizes', destination: '/blog/ichiban-kuji-toha', permanent: true },
      // 売る（display の「未開封で保管するときの注意」を sell-where に移植）
      { source: '/blog/ichiban-kuji-display', destination: '/blog/ichiban-kuji-sell-where', permanent: true },
      // ブログ外のページへ（移植なし）
      { source: '/blog/ichiban-kuji-info', destination: '/schedule', permanent: true },
      { source: '/blog/ichiban-kuji-dragon-ball', destination: '/ip/db', permanent: true },
      { source: '/blog/ichiban-kuji-one-piece', destination: '/ip/onep', permanent: true },
      // SEO監査v2 Step 6 Batch 2: 「1回いくら」と「期待値の使い方」を統合（2026-11）。
      // 1回いくら（prize-cost の「複数の賞をまとめて狙う」節、price の ONLINE 送料の1文を sougaku に移植）
      { source: '/blog/ichiban-kuji-price', destination: '/blog/ichiban-kuji-sougaku', permanent: true },
      { source: '/blog/ichiban-kuji-prize-cost', destination: '/blog/ichiban-kuji-sougaku', permanent: true },
      // 期待値の使い方（tips のチェックリスト、budget の予算上限・損切り、smart の「やめとけ」の理由を kitaichi-toha に1節で移植）
      { source: '/blog/ichiban-kuji-tips', destination: '/blog/kitaichi-toha', permanent: true },
      { source: '/blog/ichiban-kuji-smart', destination: '/blog/kitaichi-toha', permanent: true },
      { source: '/blog/ichiban-kuji-budget', destination: '/blog/kitaichi-toha', permanent: true },
    ];
  },
};

export default nextConfig;
