/**
 * 月次発売まとめ記事を自動生成するスクリプト
 *
 * 使い方:
 *   npm run monthly-news           → 翌月分を生成
 *   npm run monthly-news 2026-08   → 指定月分を生成
 *
 * 生成先: news-posts/monthly-YYYY-MM.md
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
  // 対象月を決定（引数 or 翌月）
  const arg = process.argv[2]
  let year: number, month: number

  if (arg && /^\d{4}-\d{2}$/.test(arg)) {
    const [y, m] = arg.split('-').map(Number)
    year = y; month = m
  } else {
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    year = next.getFullYear()
    month = next.getMonth() + 1
  }

  const mm = String(month).padStart(2, '0')
  const from = `${year}-${mm}-01`
  const to = `${year}-${mm}-31`

  console.log(`▶ ${year}年${month}月分を生成中...`)

  const { data: kujiList, error } = await supabase
    .from('kuji')
    .select('id, title, price, release_at, image_url')
    .eq('is_active', true)
    .gte('release_at', from)
    .lte('release_at', to)
    .order('release_at', { ascending: true })

  if (error) { console.error(error); process.exit(1) }
  if (!kujiList?.length) {
    console.log('対象くじが見つかりません。Supabaseのデータを確認してください。')
    process.exit(0)
  }

  // 各くじの賞の種類数を取得
  const prizeCounts: Record<number, number> = {}
  for (const kuji of kujiList) {
    const { count } = await supabase
      .from('prizes')
      .select('*', { count: 'exact', head: true })
      .eq('kuji_id', kuji.id)
    prizeCounts[kuji.id] = count ?? 0
  }

  const monthStr = `${year}年${month}月`
  const slug = `monthly-${year}-${mm}`
  const dateStr = `${year}-${mm}-01`
  const title = `${monthStr}発売 一番くじ まとめ【全${kujiList.length}種】`
  const summary = `${monthStr}に発売予定の一番くじを一覧でまとめました。全${kujiList.length}種の発売日・価格・賞品数を確認できます。`
  const imageUrl = kujiList.find(k => k.image_url)?.image_url ?? ''

  const tableRows = kujiList.map(k => {
    const parts = k.release_at.split('-').slice(1).map(Number)
    const day = `${parts[0]}月${parts[1]}日`
    const prizeStr = prizeCounts[k.id] > 0 ? `${prizeCounts[k.id]}種` : '-'
    return `| [${k.title}](https://kujinone.com/kuji/${k.id}) | ${day} | ${k.price.toLocaleString()}円 | ${prizeStr} |`
  }).join('\n')

  const detailLinks = kujiList.map(k =>
    `- [${k.title}](https://kujinone.com/kuji/${k.id}) — ${k.price.toLocaleString()}円/回`
  ).join('\n')

  const md = `---
title: "${title}"
date: "${dateStr}"
release_date: "${dateStr}"
summary: "${summary}"
image_url: "${imageUrl}"
---

## ${monthStr}発売 一番くじ 一覧

${monthStr}に発売予定の一番くじをまとめました。[期待値計算ツール](/calc)を使えば、目当ての賞が当たるまでの平均費用を事前に確認できます。

| くじ名 | 発売日 | 価格/回 | 賞の種類 |
|--------|--------|---------|---------|
${tableRows}

## 各くじの詳細・期待値

${detailLinks}

---

## 一番くじの期待値とは？

目当ての賞を引き当てるまでに**平均いくらかかるか**を示す指標です。[期待値計算ツール](/calc)で事前にシミュレーションしてから引くと、予算オーバーを防げます。

[→ 期待値を計算してみる](/calc)
`

  const outPath = path.join(process.cwd(), 'news-posts', `${slug}.md`)
  fs.writeFileSync(outPath, md, 'utf-8')
  console.log(`✓ 生成完了: news-posts/${slug}.md`)
  console.log(`  対象: ${kujiList.length}件 / ${monthStr}`)
  console.log('')
  console.log('次のステップ:')
  console.log('  git add news-posts/' + slug + '.md')
  console.log('  git commit -m "feat: ' + monthStr + '発売まとめ記事を追加"')
  console.log('  git push origin main')
}

main().catch(err => { console.error(err); process.exit(1) })
