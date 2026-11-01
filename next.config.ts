import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [new URL('https://assets.1kuji.com/**')],
  },
  async redirects() {
    return [
      // ichiban-kuji-conveni.mdとほぼ同内容でキーワードが競合していたため統合。
      // 既存の被リンク・検索順位をconveni.mdに引き継ぐための301。
      // /today（今日・今週発売）は /schedule の「次に発売」・日付見出しに統合した（2026-11）。
      {
        source: '/today',
        destination: '/schedule',
        permanent: true,
      },
      {
        source: '/blog/ichiban-kuji-store',
        destination: '/blog/ichiban-kuji-conveni',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
