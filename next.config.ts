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
      {
        source: '/blog/ichiban-kuji-store',
        destination: '/blog/ichiban-kuji-conveni',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
