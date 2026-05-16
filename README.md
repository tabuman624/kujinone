# Next.js 移植パッケージ

このフォルダの中身を、`kujinone/` プロジェクトの **同じパス** にコピー上書きすると、プロトタイプのデザインが反映されます。

## 上書き／追加するファイル

| パス | 種類 | 内容 |
|---|---|---|
| `app/globals.css` | 上書き | アニメーション CSS と `.kuji-prose--article` を追加 |
| `app/layout.tsx` | 上書き | スマホ用ボトムナビを `<BottomNav />` に差し替え |
| `app/template.tsx` | 新規 | ルート切替ごとに `anim-page` を再生 |
| `app/components/BottomNav.tsx` | 新規 | スライドする赤インジケーター付きナビ（Client Component） |
| `app/page.tsx` | 上書き | シンプルなヒーロー＋番号付きコラムリスト |
| `app/schedule/page.tsx` | 上書き | スタガード演出を追加 |
| `app/kuji/[id]/page.tsx` | 上書き | スタガード演出と CTA の影 |
| `app/calc/page.tsx` | 上書き | ライブ計算・ステッパー・チップ選択（Client Component） |
| `app/blog/page.tsx` | 上書き | Featured カード＋番号付きリスト |
| `app/blog/[slug]/page.tsx` | 上書き | ライトヘッダー＋赤縦バー見出し |
| `app/blog/[slug]/ReadingProgress.tsx` | 新規 | スクロール連動の読書プログレスバー（Client） |
| `app/howto/page.tsx` | 上書き | 縦タイムライン |

## 触っていないファイル

- `app/terms/page.tsx`、`app/privacy/page.tsx`、`app/lib/supabase.ts`、`posts/*.md` などはそのままで OK です。

## メモ

- 既存の `app/calc/page.tsx` で使われていた `useState`/`useEffect`/`Suspense` の構造はそのまま継承しています。
- `app/template.tsx` を新規追加することでハッシュルーター時代と同じ「ページ遷移アニメ」が機能します。不要なら削除して構いません。
- アニメーション系のクラス（`.anim-fade-up` `.anim-pop` `.anim-result` 等）はすべて `globals.css` に定義済みです。
