# くじのね サービス仕様書 v1.0

> **Claude Codeへ：** このドキュメントはClaude Code実装用に最適化された順序で構成されています。セクション1〜8が実装時の主要参照先です。

---

## 1. サービス概要

### サービス名
**くじのね（kujinone）**

### コンセプト
「一番くじの期待値を計算し、賢くくじを楽しめるようにする」

一番くじ専門の期待値計算ツール＋発売スケジュール＋二次流通相場を一体化したサービス。  
単なる計算ツールではなく、ヤフオク・Yahoo!ショッピングの相場をリアルタイム取得し、メルカリ・駿河屋との比較までを一画面で完結させる差別化を図る。

### ターゲット
- 一番くじを引こうか迷っている人
- 目当ての賞が当たるまでの費用を事前に把握したい人
- メルカリ・駿河屋での購入と比較検討したい人

### ドメイン
https://kujinone.com

---

---

## 2. 技術スタック

| レイヤー | 技術 | 理由 |
|---|---|---|
| フロントエンド | Next.js 16（App Router） | SEOに必須のSSR/SSG・ISR対応 |
| バックエンド | Next.js API Routes | フロントと同一リポジトリ・Vercelで完結 |
| DB・認証 | Supabase（PostgreSQL） | 無料枠大・RLS対応 |
| スタイリング | Tailwind CSS v4 | ユーティリティファースト |
| フォント | Geist（Next.js Font） | パフォーマンス最適化済み |
| マークダウン | marked + gray-matter | ブログ・速報記事のMD処理 |
| ホスティング | Vercel | Next.jsとの最適統合・Cron対応 |
| 相場取得 | Yahoo! Shopping API + ヤフオクスクレイピング | 二次流通相場のリアルタイム取得 |

---

---

## 3. 実装補足仕様

### 3-1. UIデザイン基本方針

#### 配色

```css
Primary:    red-600（#dc2626）  /* ボタン・アクセント */
Background: gray-100（#f3f4f6）/* ページ背景 */
Surface:    white               /* カード・モーダル背景 */
Text:       gray-900（#111827）/* 本文 */
SubText:    gray-400            /* サブテキスト・ラベル */
```

#### レイアウト

```
最大幅：max-w-4xl・中央揃え
モバイルファースト設計
ブレークポイント：md（768px）

カラム：
  └─ モバイル：1カラム・ボトムナビ
  └─ PC（md以上）：サイドナビ（240px固定）＋コンテンツエリア

余白：
  └─ ページ内セクション：px-5 py-6
  └─ カード内：p-3〜p-4
  └─ ボタン：py-3.5
```

#### アニメーション

```css
/* globals.css に定義済み */
.anim-fade-up     /* 下からフェードイン */
.anim-pop         /* スケールポップ */
.anim-tab-bounce  /* タブ切り替え */
.press            /* タップ時の縮小フィードバック */
```

#### ナビゲーション

```
PC：SideNav（app/components/SideNav.tsx）
  └─ 左固定 240px
  └─ ロゴ・主要4リンク

モバイル：BottomNav（app/components/BottomNav.tsx）
  └─ 下部固定
  └─ ホーム・スケジュール・計算・ブログ・速報
  └─ スライドする赤インジケーター付き
```

---

### 3-2. Supabase実装パターン

Claude Codeはこのパターンに従って実装する。混在させない。

#### 現在の実装（単一クライアント）

```typescript
// app/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

#### 使い分けルール

| 場所 | 使用クライアント | 理由 |
|---|---|---|
| app/以下のServer Component | supabase（anon） | 公開データの読み取りのみ |
| app/api/cron/ | SUPABASE_SERVICE_ROLE_KEY | RLSをバイパスして書き込み |
| app/api/market-price/ | SUPABASE_SERVICE_ROLE_KEY | prizesテーブルへの書き込み |
| app/api/track-\* | NEXT_PUBLIC_SUPABASE_ANON_KEY | RPC経由・anonで十分 |

> ⚠️ **セキュリティ注意**：ユーザー向けAPIで `SUPABASE_SERVICE_ROLE_KEY` を使うとRLSが無効になる。Cron・管理操作専用のみに限定すること。

---

### 3-3. エラーハンドリング方針

#### APIエラーの標準レスポンス

```typescript
// 成功
return Response.json({ success: true, data: result }, { status: 200 })

// バリデーションエラー
return Response.json({ success: false, error: 'エラーメッセージ' }, { status: 400 })

// 認証エラー（Cron）
return new Response('Unauthorized', { status: 401 })

// サーバーエラー
return Response.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
```

#### トラッキングAPI（Fire-and-Forget）

```typescript
// track-kuji-view / track-interest はエラーを無視
fetch('/api/track-kuji-view', { method: 'POST', body: ... })
  .catch(() => {}) // エラー握りつぶし・UX優先
```

---

### 3-4. ISR・キャッシュ戦略

```typescript
// 全Server Componentページに統一設定
export const revalidate = 3600  // 1時間ごとに再生成

// 対象ページ
// app/page.tsx
// app/schedule/page.tsx
// app/kuji/[id]/page.tsx
// app/blog/[slug]/page.tsx
// app/news/[slug]/page.tsx
// app/sitemap.ts
```

#### 相場データキャッシュ

```typescript
const CACHE_TTL_HOURS = 6  // 6時間キャッシュ
// prizes.market_price_updated_at で最終更新を判定
// 6時間以内なら再スクレイピングをスキップ
```

---

### 3-5. フォルダ構造

```
kujinone/
├── app/
│   ├── api/
│   │   ├── market-price/route.ts        # 相場取得（service_role）
│   │   ├── track-kuji-view/route.ts     # 閲覧数追跡（anon）
│   │   ├── track-interest/route.ts      # 景品関心追跡（anon）
│   │   └── cron/
│   │        └── update-prices/route.ts  # 価格Cron（service_role）
│   │
│   ├── blog/
│   │   ├── page.tsx                     # コラム一覧（ISR）
│   │   ├── BlogTabs.tsx                 # カテゴリフィルタ
│   │   └── [slug]/
│   │        ├── page.tsx                # コラム詳細（ISR）
│   │        └── ReadingProgress.tsx     # 読書プログレスバー
│   │
│   ├── news/
│   │   ├── page.tsx                     # 新作速報一覧（ISR）
│   │   └── [slug]/page.tsx             # 新作速報詳細（ISR）
│   │
│   ├── kuji/
│   │   └── [id]/
│   │        ├── page.tsx               # くじ詳細（ISR）
│   │        ├── PrizeList.tsx          # 賞一覧・サムネ・モーダル
│   │        ├── PrizePopularity.tsx    # 注目度バーグラフ
│   │        └── KujiViewTracker.tsx    # 閲覧数追跡（Client）
│   │
│   ├── schedule/
│   │   ├── page.tsx                    # 発売スケジュール（ISR）
│   │   └── ScheduleList.tsx            # 月別フィルタ（Client）
│   │
│   ├── calc/
│   │   └── page.tsx                    # 期待値計算ツール（Client）
│   │
│   ├── components/
│   │   ├── SideNav.tsx                 # PCサイドナビ
│   │   ├── BottomNav.tsx               # モバイルボトムナビ
│   │   └── A8Script.tsx                # A8.net広告スクリプト
│   │
│   ├── lib/
│   │   └── supabase.ts                 # Supabaseクライアント
│   │
│   ├── contact/page.tsx                # お問い合わせ（Formspree）
│   ├── privacy/page.tsx                # プライバシーポリシー
│   ├── terms/page.tsx                  # 利用規約
│   ├── howto/page.tsx                  # 使い方ガイド
│   ├── layout.tsx                      # ルートレイアウト・GA4・AdSense
│   ├── page.tsx                        # ホーム（ISR）
│   ├── robots.ts                       # robots.txt
│   ├── sitemap.ts                      # サイトマップ自動生成（ISR）
│   ├── template.tsx                    # ページ遷移アニメーション
│   └── globals.css                     # アニメーション・共通スタイル
│
├── posts/                              # ブログ記事（Markdown）
│   └── *.md
│
├── news-posts/                         # 新作速報記事（Markdown）
│   └── *.md
│
├── scripts/                            # 記事生成スクリプト
│   ├── generate-monthly-news.ts
│   └── generate-ranking-post.ts
│
├── public/
│   ├── logo.png
│   └── icon.png
│
├── .env.local                          # 環境変数（セクション4-4参照）
├── vercel.json                         # Cronスケジュール設定
├── tailwind.config.ts
└── next.config.ts
```

---

### 3-6. テスト方針

現フェーズはテストコードを書かない。手動テストチェックリストで代替する。

#### 手動テストチェックリスト

```
【期待値計算】
□ くじ選択→賞チェック→計算結果が表示される
□ 賞を選択すると /api/track-interest が呼ばれる
□ 相場取得ボタンで市場価格が表示される
□ 「メルカリで見る」「駿河屋で見る」リンクが機能する

【くじ詳細ページ】
□ 賞一覧・サムネイルが表示される
□ アフィリエイトリンクに rel="noopener noreferrer sponsored" がある
□ 【PR】表記がある
□ OGPが正しく設定されている

【発売スケジュール】
□ 月フィルタで絞り込みができる
□ くじ画像が正しく表示される

【SEO・インフラ】
□ サイトマップに全URLが含まれている
□ JSON-LDが正しく出力されている
□ ISR（revalidate=3600）が機能している

【Cron】
□ CRON_SECRETなしのリクエストが401を返す
□ 価格更新後にprizes.market_priceが更新される
```

---

---

## 4. 実装ステップ（現状整理）

### 実装済み機能

```
Step 1：インフラ基盤
  ├─ Next.js App Router セットアップ
  ├─ Supabase接続
  ├─ Vercelデプロイ
  └─ ドメイン設定（kujinone.com）

Step 2：DBスキーマ
  ├─ kuji テーブル
  ├─ prizes テーブル
  ├─ kuji_views テーブル
  ├─ prize_interest テーブル
  └─ price_history テーブル

Step 3：コアページ
  ├─ ホーム（/）
  ├─ 発売スケジュール（/schedule）
  ├─ くじ詳細（/kuji/[id]）
  └─ 期待値計算ツール（/calc）

Step 4：コンテンツページ
  ├─ ブログ（/blog, /blog/[slug]）
  ├─ 新作速報（/news, /news/[slug]）
  ├─ 使い方（/howto）
  └─ 法的ページ（/privacy, /terms, /contact）

Step 5：相場・API
  ├─ /api/market-price（Yahoo相場取得）
  ├─ /api/cron/update-prices（日次価格更新）
  ├─ /api/track-kuji-view（閲覧追跡）
  └─ /api/track-interest（景品関心追跡）

Step 6：トラッキング・広告
  ├─ Google Analytics（G-88R7X8E7B0）
  ├─ Google AdSense（ca-pub-9006140407795306）
  ├─ A8.net（config_id: xLVEUKG6qLmgP54TvR6L）
  └─ アフィリエイトリンク（駿河屋・Yahoo・楽天）

Step 7：SEO基盤
  ├─ サイトマップ自動生成
  ├─ robots.txt
  ├─ JSON-LD（各ページ）
  └─ ISR（revalidate=3600）
```

### 今後の実装候補

```
Step 8：ユーザー機能（検討中）
  └─ お気に入りくじ保存（ローカルストレージ or Supabase Auth）

Step 9：通知機能（検討中）
  └─ 新着くじのPush通知 or LINE通知

Step 10：コンテンツ拡充
  ├─ AIを使った新作速報記事自動生成
  └─ くじ攻略データの充実
```

---

---

## 5. データ設計

### 5-1. DBスキーマ

```sql
kuji（一番くじ本体）
  id BIGINT PRIMARY KEY,
  title VARCHAR NOT NULL,                    -- くじタイトル
  price INTEGER NOT NULL,                    -- 1回の価格（円）
  total INTEGER,                             -- 全本数
  release_at DATE,                           -- 発売日
  image_url TEXT,                            -- 商品画像URL
  banner_url TEXT,                           -- バナー画像URL
  product_id VARCHAR,                        -- 一番くじ公式の製品ID
  tweet_urls TEXT[],                         -- 公式X投稿URL（配列）
  is_active BOOLEAN DEFAULT true,            -- 表示フラグ
  created_at TIMESTAMPTZ DEFAULT NOW()

prizes（景品）
  id BIGINT PRIMARY KEY,
  kuji_id BIGINT REFERENCES kuji(id),
  name VARCHAR NOT NULL,                     -- 景品名
  grade VARCHAR NOT NULL,                    -- 賞グレード（A賞・B賞など）
  total INTEGER NOT NULL,                    -- 本数
  image_url TEXT,                            -- 景品画像URL
  sort_order INTEGER NOT NULL,               -- 表示順
  market_price INTEGER,                      -- Yahoo!ショッピング安定価格
  market_price_updated_at TIMESTAMPTZ,       -- 相場最終更新日時
  auction_price_min INTEGER,                 -- ヤフオク最低落札価格
  auction_price_max INTEGER,                 -- ヤフオク最高落札価格
  auction_price_updated_at TIMESTAMPTZ,      -- ヤフオク相場最終更新日時
  auction_price_peak INTEGER,                -- ヤフオク最高値（累積）

kuji_views（くじページ閲覧数）
  id BIGINT PRIMARY KEY,
  kuji_id BIGINT REFERENCES kuji(id),
  view_count INTEGER DEFAULT 0,
  CONSTRAINT unique_kuji_view UNIQUE (kuji_id)

prize_interest（景品関心数）
  id BIGINT PRIMARY KEY,
  prize_id BIGINT REFERENCES prizes(id),
  check_count INTEGER DEFAULT 0,
  CONSTRAINT unique_prize_interest UNIQUE (prize_id)

price_history（価格変動履歴）
  id BIGINT PRIMARY KEY,
  prize_id BIGINT REFERENCES prizes(id),
  price INTEGER NOT NULL,                    -- その日の価格スナップショット
  recorded_at DATE NOT NULL,
  CONSTRAINT unique_price_history UNIQUE (prize_id, recorded_at)
```

### 5-1-b. RLS設計

#### 基本方針

| テーブル | 読み取り | 書き込み |
|---|---|---|
| kuji | 全員（anon） | 禁止（管理はSupabase Dashboard） |
| prizes | 全員（anon） | 禁止（同上） |
| kuji_views | 全員（anon） | RPCのみ（increment_kuji_view） |
| prize_interest | 全員（anon） | RPCのみ（increment_prize_interest） |
| price_history | 全員（anon） | service_role のみ（Cron） |

#### CREATE POLICY SQL

```sql
-- kuji
ALTER TABLE kuji ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_kuji" ON kuji
  FOR SELECT TO anon, authenticated USING (true);

-- prizes
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_prizes" ON prizes
  FOR SELECT TO anon, authenticated USING (true);

-- kuji_views（読み取りのみ許可・書き込みはSECURITY DEFINER RPCを経由）
ALTER TABLE kuji_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_kuji_views" ON kuji_views
  FOR SELECT TO anon, authenticated USING (true);

-- prize_interest（同上）
ALTER TABLE prize_interest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_prize_interest" ON prize_interest
  FOR SELECT TO anon, authenticated USING (true);

-- price_history（読み取りのみ許可・書き込みはservice_roleがRLSをバイパス）
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_price_history" ON price_history
  FOR SELECT TO anon, authenticated USING (true);
```

> ⚠️ `kuji_views`・`prize_interest` への書き込みはRPCのみ経由させる。  
> `SECURITY DEFINER` 関数がRLSを回避して `INSERT ... ON CONFLICT DO UPDATE` を実行するため、直接のINSERT/UPDATEポリシーは不要。

---

### 5-2. RPC関数（SECURITY DEFINER）

```sql
-- くじページ閲覧カウント増加
-- anonキーで呼び出し可能・SECURITY DEFINERでRLSを回避
CREATE OR REPLACE FUNCTION increment_kuji_view(p_kuji_id BIGINT)
RETURNS void AS $$
BEGIN
  INSERT INTO kuji_views (kuji_id, view_count)
  VALUES (p_kuji_id, 1)
  ON CONFLICT (kuji_id)
  DO UPDATE SET view_count = kuji_views.view_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 景品関心カウント増加
CREATE OR REPLACE FUNCTION increment_prize_interest(p_prize_id BIGINT)
RETURNS void AS $$
BEGIN
  INSERT INTO prize_interest (prize_id, check_count)
  VALUES (p_prize_id, 1)
  ON CONFLICT (prize_id)
  DO UPDATE SET check_count = prize_interest.check_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5-3. 期待値計算ロジック

```
目当て賞Aが当たるまでの平均費用の計算式：

期待値 = (全本数 + 1) ÷ (目当て賞の本数 + 1) × 1回の価格

例：全50本・A賞2本・800円のくじ
  期待値 = (50 + 1) ÷ (2 + 1) × 800 = 13,600円

複数賞を選択した場合：
  各賞が「いずれかが当たるまで」の期待値として合算計算
```

### 5-4. 相場データ更新ルール

```
発売7日以内のくじ：
  └─ 毎日スキャン（需要が高く相場変動が大きい）

発売8〜90日のくじ：
  └─ 土曜日のみ・最大15本のローテーション

発売90日超のくじ：
  └─ 価格追跡停止（is_active フラグで管理）

キャッシュ：
  └─ 6時間以内に更新済みなら再取得しない
```

---

---

## 6. 技術的課題と対策

### 6-1. 技術的課題マップ

#### 🔴 高リスク（対応必要）

| 課題 | 内容 | 対策 |
|---|---|---|
| ヤフオクスクレイピング | 利用規約・構造変更リスク | Yahoo! ショッピングAPIを主軸に・オークションは補助 |
| スクレイピングブロック | IPブロック・User-Agent検出 | 現状Chromium偽装・ブロック時は要対応 |

#### 🟡 中リスク（フェーズ移行前に解決）

| 課題 | 内容 | 対策 |
|---|---|---|
| Vercelタイムアウト | 無料枠10秒制限・相場一括取得が長い | バッチサイズ・CONCURRENCY制限で対応済み |
| 画像変換コスト | 外部CDN画像のVercel最適化で課金 | `unoptimized` フラグで最適化スキップ |

#### 🟢 低リスク（設計で対処済み）

| 課題 | 内容 | 対処方針 |
|---|---|---|
| Supabase無料枠 | 500MB Storage超過 | 画像はSupabase Storage非使用（外部CDN参照のみ） |
| SEOインデックス未確認 | ISR設定ミス | Google Search Consoleで定期確認 |

---

### 6-2. Yahoo! 相場取得設計

#### Yahoo! Shopping API（安定価格）

```typescript
const YAHOO_SHOPPING_URL = 'https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch'

// 検索キーワード：buildKeywords()で生成（4段階フォールバック）
//   1. prize.name（景品名そのまま）
//   2. prize.name + kuji.titleの先頭2単語
//   3. kuji.titleの先頭2単語のみ
//   4. kuji.titleの先頭1単語のみ
// 結果のフィルタリング：
//   PRICE_MIN=500円・PRICE_MAX=200,000円 の範囲外を除外
//   isRelevant()：キーワードとの一致率が35%未満の商品を除外
// 結果：フィルタ後の中央値をmarket_priceとして保存
// タイムアウト：AbortSignal.timeout(8000)
```

#### ヤフオクスクレイピング（落札相場）

```typescript
// 落札済み検索URL
const url = `https://auctions.yahoo.co.jp/search/search?p=${keyword}&va=${keyword}&auccat=&tab_ex=commerce&ei=utf-8&aq=-1&oq=&sc_i=&exflg=1&b=1&n=50&s1=end&o1=d&complete=1`

// __NEXT_DATA__ JSONをパースして落札価格を取得
// 取得項目：最低価格(min)・最高価格(max)・最高値累積(peak)
// PRICE_MIN〜PRICE_MAX でフィルタリング
```

#### バッチ処理設定

```typescript
const CACHE_TTL_HOURS = 6      // キャッシュ有効期間
const OLD_KUJI_BATCH_SIZE = 15 // 古いくじの1回あたり更新数
const CONCURRENCY = 5          // 並列リクエスト数
```

---

---

## 7. URL設計・ページ構成

### 7-1. URL構造

| ページ | URL | 備考 |
|---|---|---|
| ホーム | / | 注目くじ・新着 |
| 発売スケジュール | /schedule | 全くじ一覧・月別フィルタ |
| くじ詳細 | /kuji/[id] | 賞一覧・アフィリエイトリンク |
| 期待値計算 | /calc | クエリ `?kuji_id=` で自動入力 |
| ブログ一覧 | /blog | カテゴリフィルタ |
| ブログ記事 | /blog/[slug] | |
| 新作速報一覧 | /news | |
| 新作速報記事 | /news/[slug] | |
| 使い方 | /howto | |
| お問い合わせ | /contact | Formspree |
| プライバシーポリシー | /privacy | |
| 利用規約 | /terms | |

### 7-2. ホーム構成

```
① ヒーローセクション
  └─ キャッチコピー・期待値計算CTAボタン

② 注目のくじ（Supabaseから最新order）
  └─ くじカード一覧（画像・タイトル・価格・発売日）

③ 使い方3ステップ
  └─ くじを選ぶ→賞を選ぶ→費用を確認

④ 新着コラム
  └─ ブログ記事へのリンク

⑤ フッター
  └─ ナビリンク・アフィリエイト表記
```

### 7-3. 期待値計算UIフロー

#### パターンA：くじIDあり（/calc?kuji_id={id}）

```
/calc?kuji_id={id} でアクセス
  └─ Step 1：くじ選択（セレクトボックス）
  └─ Step 2：目当ての賞をチェック（複数選択可）
       └─ チェック時に /api/track-interest を呼び出し
  └─ Step 3：期待値を自動計算・アニメーション表示
  └─ Step 4：「相場を取得する」ボタン
       └─ /api/market-price を呼び出し
       └─ ヤフオク・Yahoo!ショッピング相場を表示
  └─ Step 5：アフィリエイトリンク表示
       └─ メルカリ・駿河屋【PR】・Yahoo!【PR】・楽天【PR】
```

#### パターンB：手動入力モード（くじ未選択）

```
/calc にクエリなしでアクセス、またはくじ選択を使わない場合
  └─ 手動入力フォームが表示される
       └─ 「全本数」（manualTotal）
       └─ 「目当て賞の本数」（manualTarget）
       └─ 「1回の価格」（manualPrice、デフォルト800円）
  └─ 入力値をもとに期待値を即時計算・アニメーション表示
  └─ 相場取得・トラッキングはなし（くじIDが必要なため）
```

---

---

## 8. API設計

### 8-1. API Routes一覧

#### 相場取得API

| メソッド | パス | 処理 |
|---|---|---|
| GET | /api/market-price | Yahoo相場・ヤフオク相場取得（service_role） |

**リクエスト**：`?kuji_id=123`  
**レスポンス**：
```json
{
  "prices": [
    {
      "id": 1,
      "stable_price": 5000,
      "auction_min": 4500,
      "auction_max": 6200,
      "auction_peak": 8000
    }
  ],
  "cached": false
}
```

#### トラッキングAPI

| メソッド | パス | 処理 |
|---|---|---|
| POST | /api/track-kuji-view | くじページ閲覧カウント（anon RPC） |
| POST | /api/track-interest | 景品関心カウント（anon RPC） |

**リクエスト**：`{ kuji_id: number }` / `{ prize_id: number }`  
**レスポンス**：`{ ok: true }`（エラーはFire-and-Forget）

#### Cron API

| メソッド | パス | スケジュール |
|---|---|---|
| GET | /api/cron/update-prices | 毎日 18:00 UTC（03:00 JST） |

**認証**：`Authorization: Bearer {CRON_SECRET}`  
**処理**：発売7日以内のくじ全件 ＋ 古いくじ最大15本の相場更新

---

### 8-2. Vercel Cron設定

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/update-prices",
      "schedule": "0 18 * * *"
    }
  ]
}
```

---

### 8-3. 環境変数一覧

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Yahoo! API
YAHOO_APP_ID=

# Vercel Cron
CRON_SECRET=

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-88R7X8E7B0

# サイトURL
NEXT_PUBLIC_SITE_URL=https://kujinone.com
```

---

---

## 9. アフィリエイト・広告設計

### 9-1. アフィリエイトリンク一覧

| サービス | 種別 | rel属性 | 表示 |
|---|---|---|---|
| メルカリ | 検索リンク（非アフィリエイト） | `noopener noreferrer` | 「メルカリで相場を見る」 |
| 駿河屋 | アフィリエイト（affiliate.suruga-ya.jp） | `noopener noreferrer sponsored` | 「駿河屋で相場を見る【PR】」 |
| Yahoo!ショッピング | アフィリエイト（af.moshimo.com） | `noopener noreferrer sponsored` | 「Yahoo!ショッピングで見る【PR】」 |
| 楽天市場 | アフィリエイト（af.moshimo.com） | `noopener noreferrer sponsored` | 「楽天市場で見る【PR】」 |

```html
<!-- アフィリエイトリンクの実装例 -->
<a
  href="{affiliate_url}"
  target="_blank"
  rel="noopener noreferrer sponsored"
>
  駿河屋で相場を見る【PR】
</a>
```

### 9-2. 広告表記ルール

```
全ページフッター：
  └─ 「当サイトはアフィリエイト広告を利用しています」を常設

くじ詳細ページ（アフィリエイトリンク付近）：
  └─ 【PR】表記をリンクラベルに含める

メルカリリンクには【PR】不要（アフィリエイトではないため）
```

### 9-3. 広告配信

| サービス | ID | 配置 |
|---|---|---|
| Google AdSense | ca-pub-9006140407795306 | layout.tsx の `<head>` |
| A8.net | config_id: xLVEUKG6qLmgP54TvR6L | A8Script.tsx（layout.tsx に挿入） |

---

---

## 10. コンテンツ設計

### 10-1. ブログ記事（posts/\*.md）

#### Frontmatterスキーマ

```yaml
---
title: 記事タイトル
date: 2026-05-01
category: 基礎 | 期待値 | 攻略 | 相場 | 景品
summary: 一覧・OGPに使用する説明文（〜100文字）
---
```

#### カテゴリ定義

| カテゴリ | 内容 |
|---|---|
| 基礎 | 一番くじの仕組み・ルール解説 |
| 期待値 | 期待値の考え方・計算方法 |
| 攻略 | くじを賢く引くテクニック |
| 相場 | メルカリ・駿河屋との価格比較 |
| 景品 | 賞品の種類・レア度解説 |

### 10-2. 新作速報記事（news-posts/\*.md）

#### Frontmatterスキーマ

```yaml
---
title: 記事タイトル
date: 2026-06-01        # 記事作成日
release_date: 2026-06-15 # くじ発売日
summary: 説明文
image_url: https://...  # くじ画像URL
kuji_id: 123            # SupabaseのkujiテーブルID（リンク用）
---
```

#### ファイル命名規則

```
news-posts/kuji-{製品名slug}.md
例：kuji-onep103.md, kuji-kimetsu30.md
```

---

---

## 11. SEO設計

### 11-1. ページ別SEO戦略

| ページ | 狙うキーワード | 構造化データ |
|---|---|---|
| /kuji/[id] | 「{くじ名} 期待値」 | BreadcrumbList |
| /calc | 「一番くじ 期待値 計算」 | WebSite |
| /blog/[slug] | 各記事キーワード | Article + FAQ |
| /news/[slug] | 「{くじ名} 発売日 賞品」 | NewsArticle + BreadcrumbList |
| /schedule | 「一番くじ 発売スケジュール」 | BreadcrumbList + ItemList |

### 11-2. 動的OGP

```typescript
// /kuji/[id]/page.tsx
export async function generateMetadata({ params }) {
  const kuji = await supabase.from('kuji').select('title, price, banner_url, image_url')...
  return {
    title: `${kuji.title} 期待値 | くじのね`,
    description: `${kuji.title}の期待値を計算。1回${kuji.price}円のくじを引く前に確認。`,
    openGraph: {
      images: [{ url: kuji.banner_url || kuji.image_url || '/logo.png' }],
    },
  }
}
```

### 11-3. サイトマップ設計

```typescript
// app/sitemap.ts（revalidate = 3600）
// 含まれるURL：
//   静的：/・/schedule・/calc・/blog・/news・/howto・/privacy・/terms・/contact
//   動的：/kuji/[id]（Supabaseのis_active=trueのみ）
//   MD記事：/blog/[slug]・/news/[slug]（dateフロントマターをlastModifiedに使用）
```

---

---

## 12. ユーザー行動トラッキング設計

### 12-1. トラッキング一覧

| イベント | トリガー | 実装 | クールダウン |
|---|---|---|---|
| くじページ閲覧 | /kuji/[id] 表示時 | KujiViewTracker（Client） | 24時間 |
| 景品への関心 | /calcで賞チェック時 | track-interest API | 24時間 |

### 12-2. クールダウン実装（LocalStorage）

```typescript
// 24時間クールダウン（水増し防止）
const COOLDOWN_MS = 24 * 60 * 60 * 1000

function canTrack(key: string): boolean {
  const last = localStorage.getItem(key)
  if (!last) return true
  return Date.now() - Number(last) > COOLDOWN_MS
}

function recordTrack(key: string) {
  localStorage.setItem(key, String(Date.now()))
}

// キー命名規則
// くじ閲覧：`kv_${kujiId}`
// 景品関心：`ki_${prizeId}`
```

---

---

## 13. ローンチ前必須事項

### 13-1. 法的ページチェックリスト

| 項目 | 状態 | 備考 |
|---|---|---|
| プライバシーポリシー | ✅ 実装済み | /privacy |
| 利用規約 | ✅ 実装済み | /terms |
| アフィリエイト表記（フッター） | ✅ 実装済み | 全ページ |
| 購入リンクの【PR】表記 | ✅ 実装済み | アフィリエイトのみ |
| rel="sponsored" | ✅ 実装済み | アフィリエイトリンクのみ |
| Googleアドセンスアカウント | ✅ 設定済み | ca-pub-9006140407795306 |

### 13-2. プライバシーポリシー必須記載事項

```
1. 収集する情報
   └─ アクセスログ・Cookie（Google Analytics）
   └─ LocalStorage（クールダウン管理のみ・個人特定なし）

2. アフィリエイトについて
   └─ 駿河屋・Yahoo!ショッピング・楽天市場のアフィリエイトプログラム参加
   └─ メルカリは対象外（検索リンクのみ）

3. 第三者サービス
   └─ Google Analytics・Google AdSense
   └─ A8.net
   └─ Supabase（データ保存）
   └─ Yahoo! API（相場取得）

4. Cookie・トラッキング
   └─ Google Analytics Cookieの使用を明記
```

### 13-3. API請求上限設定

#### Yahoo! Shopping API
```
GCPまたはYahoo Developer Console：
  └─ アラート設定：月1,000リクエスト到達時に通知
```

#### Anthropic API（記事生成スクリプト用）
```
Anthropicコンソール：
  └─ 月$5でアラート設定
```

---

---

## 14. 免責・法的設計

### 14-1. 免責表示

```
・期待値は確率上の目安であり、実際の結果を保証するものではありません
・相場情報は外部サービスから自動取得したものであり、実際の価格と異なる場合があります
・くじの購入判断はご自身の責任で行ってください
```

### 14-2. 著作権

- くじ画像：BANDAI SPIRITS / 各メーカー所有（外部CDN `assets.1kuji.com` 参照）
- サイトコンテンツ・ロジック：くじのね所有

---

---

## 15. 収益設計

### 15-1. 収益モデル

| 収益源 | フェーズ | 内容 |
|---|---|---|
| Google AdSense | 現在 | 全ページに配信 |
| A8.net | 現在 | スクリプト設置済み |
| 駿河屋アフィリエイト | 現在 | くじ詳細ページの購入リンク |
| Yahoo!ショッピングアフィリエイト | 現在 | くじ詳細ページの購入リンク |
| 楽天市場アフィリエイト | 現在 | くじ詳細ページの購入リンク |

### 15-2. 収益試算

| 月間PV | アドセンス | アフィリエイト | 合計 |
|---|---|---|---|
| 1万PV | 約2,000円 | 約5,000円 | 約7,000円 |
| 5万PV | 約10,000円 | 約25,000円 | 約35,000円 |
| 10万PV | 約20,000円 | 約50,000円 | 約70,000円 |

※アドセンスRPM200円・アフィリエイトCVR0.5%・平均購入単価5,000円で試算

---

---

## 16. ランニングコスト

| サービス | 現在（〜5万PV） | 成長期（〜50万PV） |
|---|---|---|
| Vercel | 無料 | $20/月 |
| Supabase | 無料 | $25/月 |
| Yahoo! API | 無料枠 | 無料枠 |
| ドメイン | 約$1/月 | 約$1/月 |
| **月額合計** | **〜$1** | **〜$46** |

---

---

## 17. 変更履歴

### v1.1（2026年6月13日）
- §5-1-b 追加：全テーブルのRLSポリシーSQL定義
- §6-2 補足：buildKeywords 4段階フォールバック・isRelevant 35%閾値・価格フィルタ範囲（500〜200,000円）
- §7-3 補足：手動入力モード（パターンB）を明記
- §8-1 修正：トラッキングAPIレスポンスを `{ ok: true }` に修正（実装と合わせる）

### v1.0（2026年6月13日）
- 初版作成
- PetLabel仕様書（v2.0）の構造を参照してKUJINONEの実装状態をドキュメント化

---

*くじのね サービス仕様書 v1.0*
*作成日：2026年6月*
