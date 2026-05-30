/**
 * 一番くじ景品 最高値ランキング記事を自動生成するスクリプト
 *
 * 使い方:
 *   npm run ranking-post
 *
 * 生成先: posts/ranking-YYYY-MM.md
 * 前提: Vercel Cronによる週次バッチでauction_price_peakが蓄積されていること
 * 生成後: git add . && git commit && git push を実行してください
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function main() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const mm = String(month).padStart(2, '0')

  console.log('▶ 最高値ランキング記事を生成中...')

  // auction_price_peakが高い順にTOP10
  const { data: prizes, error } = await supabase
    .from('prizes')
    .select('id, name, grade, kuji_id, auction_price_peak')
    .not('auction_price_peak', 'is', null)
    .order('auction_price_peak', { ascending: false })
    .limit(10)

  if (error) { console.error(error); process.exit(1) }
  if (!prizes?.length) {
    console.log('auction_price_peakのデータがまだありません。')
    console.log('先にVercel Cronが動くか、手動でバッチを実行してください。')
    process.exit(0)
  }

  // くじタイトルを取得
  const kujiIds = [...new Set(prizes.map(p => p.kuji_id))]
  const { data: kujiList } = await supabase
    .from('kuji')
    .select('id, title')
    .in('id', kujiIds)

  const kujiMap = Object.fromEntries((kujiList ?? []).map(k => [k.id, k.title as string]))

  const monthStr = `${year}年${month}月`
  const slug = `ranking-${year}-${mm}`
  const dateStr = `${year}-${mm}-01`
  const title = `一番くじ 景品 最高値ランキング TOP10【${monthStr}時点】`
  const summary = `一番くじの景品をヤフオク落札相場で比較。歴代最高値TOP10を発表します。お目当ての景品の相場チェックにどうぞ。`

  const tableRows = prizes.map((p, i) => {
    const kujiTitle = kujiMap[p.kuji_id] ?? '不明'
    const price = (p.auction_price_peak as number).toLocaleString()
    return `| ${i + 1} | ${p.grade}　${p.name} | [${kujiTitle}](https://kujinone.com/kuji/${p.kuji_id}) | ¥${price} |`
  }).join('\n')

  // 1位の景品を紹介文に使う
  const top = prizes[0]
  const topKuji = kujiMap[top.kuji_id] ?? ''
  const topPrice = (top.auction_price_peak as number).toLocaleString()

  const md = `---
title: "${title}"
date: "${dateStr}"
summary: "${summary}"
category: "ranking"
---

## 一番くじ 景品 最高値ランキング TOP10

ヤフオク落札相場を週次で記録し、**歴代最高値**をランキング形式でまとめました。一番くじの景品の中で、特に高値がつきやすいものが一目でわかります。

現在の1位は「**${topKuji}**」の **${top.grade}　${top.name}**（¥${topPrice}）です。

| 順位 | 景品名 | くじ | 最高落札値 |
|------|--------|------|-----------|
${tableRows}

> ヤフオク落札相場は週次で計測した中央値の最高値です。出品状況・時期により変動します。

## 高額景品を狙う前に期待値を確認しよう

高値がつく景品ほど、くじで引き当てるまでの費用（期待値）も高くなりがちです。[期待値計算ツール](/calc)で事前にシミュレーションしてから引くことをおすすめします。

[→ 期待値を計算してみる](/calc)

## 関連記事

- [一番くじの期待値とは？計算方法をわかりやすく解説](/blog/kitaichi-toha)
- [一番くじ vs メルカリ どちらがお得？賢い選び方を解説](/blog/kuji-vs-mercari)
`

  const outPath = path.join(process.cwd(), 'posts', `${slug}.md`)
  fs.writeFileSync(outPath, md, 'utf-8')
  console.log(`✓ 生成完了: posts/${slug}.md`)
  console.log(`  TOP${prizes.length}景品を掲載`)
  console.log('')
  console.log('次のステップ:')
  console.log('  git add posts/' + slug + '.md')
  console.log('  git commit -m "feat: ' + monthStr + '景品最高値ランキング記事を追加"')
  console.log('  git push origin main')
}

main().catch(err => { console.error(err); process.exit(1) })
