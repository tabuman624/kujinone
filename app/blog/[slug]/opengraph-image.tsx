import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { renderOgCard, OG_SIZE } from '../../lib/ogCard'

// 記事ごとのシェア画像（タイトル入り）。ビルド時に記事の数だけ作る（app/lib/ogCard.tsx）。
export const alt = 'くじのねのコラム'
export const size = OG_SIZE
export const contentType = 'image/png'
// 記事は posts/*.md の分だけ。知らない slug で画像を作らない（page.tsx と同じ）
export const dynamicParams = false

export function generateStaticParams() {
  return fs
    .readdirSync(path.join(process.cwd(), 'posts'))
    .filter(f => f.endsWith('.md'))
    .map(f => ({ slug: f.replace(/\.md$/, '') }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data } = matter(fs.readFileSync(path.join(process.cwd(), 'posts', `${slug}.md`), 'utf-8'))
  return renderOgCard({ eyebrow: 'コラム', title: String(data.title) })
}
