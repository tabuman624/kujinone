# くじのね リデザイン仕様

Claude Code がこのファイルを読んで実装するための仕様書。
`docs/DESIGN_SPEC.md` に置いて参照させること。

---

## 1. 目的

3点のみ。これ以外は変更しない。

1. ロゴを新しいマークに差し替える
2. アクセントカラーを `red-600` から朱色に、ニュートラルを `gray-*` から `stone-*` に変更する
3. トップページにヒーローセクションを追加する

---

## 2. デザイントークン

| 用途 | 値 | 旧値 |
|---|---|---|
| アクセント（朱色） | `#E14B36` | `#dc2626` / `red-600` |
| アクセント濃 | `#C93C29` | `red-700` |
| アクセント背景 | `#FDF0ED` | `red-50` / `#fef2f2` |
| 暗色ヘッダー・本文 | `#292524` (stone-800) | `#111827` / `gray-900` |
| 本文サブ | `#57534E` (stone-600) | `gray-600` |
| 補助テキスト | `#78716C` (stone-500) | `gray-500` |
| 淡色テキスト | `#A8A29E` (stone-400) | `gray-400` |
| 罫線 | `#E7E5E4` (stone-200) | `gray-200` |
| 面（薄） | `#F5F5F4` (stone-100) | `gray-100` |
| 面（最薄） | `#FAFAF9` (stone-50) | `gray-50` |
| 暗背景上のアクセント | `#F2634E` | — |

暗背景上では `#E14B36` はコントラストが落ちるため `#F2634E` を使う。

### Tailwind v4 の注意

`app/globals.css` は `@import "tailwindcss"` を使っている（v4 系）。
リポジトリ内の `tailwind.config.ts` は v4 では自動で読まれないため、
**色の定義は `globals.css` の `@theme` ブロックで行う**こと。

```css
@theme {
  --color-shu:      #E14B36;
  --color-shu-dark: #C93C29;
  --color-shu-bg:   #FDF0ED;
}
```

これで `bg-shu` `text-shu` `border-shu` が使えるようになる。
`gray-*` → `stone-*` は Tailwind 標準パレットなのでクラス名を置換するだけでよい。

---

## 3. ロゴアセット

同梱の4ファイルを `public/` に配置する。

| ファイル | 用途 |
|---|---|
| `logo-mark.svg` | 汎用マーク（白背景） |
| `logo-mark-onblack.svg` | 暗色背景用（白抜き） |
| `favicon.svg` | ファビコン（余白を詰めた版） |
| `logo-lockup.svg` | マーク＋文字ロゴ |

### マークの比率（自前で書き直す場合の定義）

棒幅を `w` として:

- 間隔 = `2/3 w`
- 高さ = 左から `2w` / `11/3 w` / `17/6 w`
- 中央の棒だけ `2/3 w` 浮かせる
- 角丸 = `w/2`（完全なピル形状）
- 外接は必ず正方形になる

中央の棒のみアクセント色、外側2本は暗色。

### ロックアップの文字について

同梱の `logo-lockup.svg` の文字は Noto Sans CJK JP Bold をアウトライン化した**仮組み**。
最終的には Zen Maru Gothic Bold に差し替える予定。今回はそのまま使ってよい。

---

## 4. ヒーローセクション

トップページ（`app/page.tsx`）の最上部に追加する。

### 確定コピー

- H1: `期待値でねらう、一番くじ`（句点なし・読点は必須）
- サブ: `商品を選ぶだけで、1回あたりの` / `損得と損益ラインがわかります。`
- 主CTA: `期待値を計算する` → `/calc`
- 副CTA: `発売スケジュール` → `/schedule`

### 構造（上から順に）

1. マーク単体（56px、中央揃え）
2. H1（`<h1>` タグで出力すること。画像化しない）
3. サブコピー（2行）
4. 主CTA（朱色ベタ、角丸10px）
5. 副CTA（枠線のみ）
6. 装飾バー帯（棒8本、うち1本のみ朱色。セクション区切りを兼ねる）

### 制約

- H1 はテキストで出力する。SEOの主要導線のため画像化しない
- 朱色のCTAは**1つだけ**。副CTAは枠線のみにする
- 小画面での折り返し崩れを防ぐため H1 に `text-wrap: balance` を当てる
- 装飾バー帯は `aria-hidden` にする

---

## 5. 変更対象ファイル

### `app/globals.css`

- `@theme` ブロックを追加してトークンを定義
- `resultGlow` の `rgba(220, 38, 38, ...)` → `rgba(225, 75, 54, ...)`
- `.kuji-prose--article` 内の色を差し替え
  - `h2::before` の `background: #dc2626` → `#E14B36`
  - `blockquote` の `border-left: 4px solid #ef4444` → `#E14B36`、`background: #fef2f2` → `#FDF0ED`
  - `code` の `color: #dc2626` → `#E14B36`
  - `th` の `background: #111827` → `#292524`
  - `pre` の `background: #111827` → `#292524`
  - 本文グレー各種を stone 系に置換

### `app/layout.tsx`

- サイドナビのロゴ部分：`<div className="w-8 h-8 bg-red-600 rounded-lg">` と中の `<span>く</span>` を丸ごと削除し、`<img src="/logo-mark.svg" alt="" className="w-8 h-8" />` に置換
- `hover:bg-red-50 hover:text-red-600` → 朱色トークンへ
- `group-hover:text-red-500` → 朱色トークンへ
- `bg-gray-100` `text-gray-900` `border-gray-200` `text-gray-400` などを stone 系に置換
- `metadata` に `icons: { icon: "/favicon.svg" }` を追加

### `app/components/BottomNav.tsx`

- インジケーターの `background: "#dc2626"` → `#E14B36`
- `text-red-600` / `hover:text-red-600` → 朱色トークン
- `text-gray-400` → `text-stone-400`
- **ナビ項目は現在5つ**（ホーム / スケジュール / 計算する / 新作速報 / コラム）。
  既存の実装が4項目のままなら合わせること。インジケーターの幅計算は
  `100 / navItems.length` なので項目数を変えれば自動追従する

### `app/page.tsx`

- ヒーローセクションを追加（第4節の仕様）

### `public/`

- SVG 4点を配置

### `tailwind.config.ts`

- v4 では読まれていない可能性が高い。動作確認のうえ、不要なら削除を提案する。
  **勝手に削除せず、まず報告すること**

---

## 6. やらないこと

- 期待値の計算ロジックには一切触れない
- Supabase のスキーマ・クエリを変更しない
- ブログ記事の中身を変更しない
- 新しい依存パッケージを追加しない
- ヒーロー以外のページ構成を変えない

---

## 7. 検証

```bash
cd ~/Desktop/kujinone
npm run dev
```

確認項目:

1. `/` でヒーローが表示され、H1 が `<h1>` タグで出ている
2. スマホ幅（375px）で H1 が不自然に折り返さない
3. ボトムナビのアクティブ色が朱色になっている
4. ブラウザタブのファビコンが新しいマークになっている
5. `red-600` `#dc2626` `gray-` の残存を全文検索して確認する

```bash
cd ~/Desktop/kujinone
grep -rn "red-600\|#dc2626\|#ef4444\|#111827" app/ --include="*.tsx" --include="*.css"
```
