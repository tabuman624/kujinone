import type { NextConfig } from "next";
// 旧 /news/kuji-{product_id}（新作速報）→ /kuji/{kuji_id} の対応表。news-posts/*.md の frontmatter kuji_id から
// 2026-11 に一度だけ書き出した静的ファイル（news-posts/ を消してもリダイレクトが残るように）。
import newsRedirects from "./app/lib/newsRedirects.json";

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
      // /howto（使い方の3ステップ）は、計算ページの説明欄（/calc の「使い方」）に統合した（2026-11）。
      { source: '/howto', destination: '/calc', permanent: true },
      // ichiban-kuji-store は conveni と重複していたため以前 conveni に統合した。conveni も
      // Batch 4 で /store に転送したので、リダイレクトが連鎖しないよう直接 /store へ向ける。
      {
        source: '/blog/ichiban-kuji-store',
        destination: '/store',
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
      // SEO監査v2 Step 6 Batch 3: 「売る」の柱と相場・タイミングを統合（2026-11）。
      // 相場の調べ方（resale のメルカリ売り切れ検索・駿河屋・ヤフオク落札相場の手順を kuji-vs-mercari に移植）
      { source: '/blog/ichiban-kuji-resale', destination: '/blog/kuji-vs-mercari', permanent: true },
      // 売る（kaitori-price の上がる／下がる条件・駿河屋の調べ方、sell-tips のセット売り・写真と説明文、value の高値がつく特徴を sell-where に移植。倍率・割合の数字は持ち込まない）
      { source: '/blog/ichiban-kuji-kaitori-price', destination: '/blog/ichiban-kuji-sell-where', permanent: true },
      { source: '/blog/ichiban-kuji-sell-tips', destination: '/blog/ichiban-kuji-sell-where', permanent: true },
      { source: '/blog/ichiban-kuji-value', destination: '/blog/ichiban-kuji-sell-where', permanent: true },
      // 実質的な費用（recover-cost の「費用−売却手取り」の考え方を all-buy に移植）
      { source: '/blog/ichiban-kuji-recover-cost', destination: '/blog/ichiban-kuji-all-buy', permanent: true },
      // タイミング（timing の発売直後／後日の比較・狙い別タイミングを order に移植）
      { source: '/blog/ichiban-kuji-timing', destination: '/blog/ichiban-kuji-order', permanent: true },
      // SEO監査v2 Step 6 Batch 4: 販売店まとめ記事は /store（取扱店から探す）が実データで置き換えているため転送（移植なし）。
      { source: '/blog/ichiban-kuji-conveni', destination: '/store', permanent: true },
      // 月入りURLのランキング記事は、常に最新の /ranking/wanted の古い写しになっていたため転送（週次の自動再生成も停止）。
      { source: '/blog/ranking-2026-09', destination: '/ranking/wanted', permanent: true },
      // 新作速報（/news）は /kuji の古い写しで、生成時のまま更新されず誤りも含んでいたため廃止（2026-11、AdSense 再申請対策★1）。
      // 一覧とフィードは /schedule（発売スケジュール）へ、各記事は同じ商品のくじページへ転送する。
      { source: '/news', destination: '/schedule', permanent: true },
      { source: '/news/feed.xml', destination: '/schedule', permanent: true },
      ...Object.entries(newsRedirects as Record<string, number>).map(([slug, kujiId]) => ({
        source: `/news/${slug}`,
        destination: `/kuji/${kujiId}`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
