import { marked } from 'marked'

// 本文Markdown中の画像（news-postsでは記事冒頭のバナー1枚のみ）は寸法指定なしの
// 生<img>になり、読み込み完了時にレイアウトが押し下げられてCLSが発生していた。
// width/height(+aspect-ratio)で読み込み前から表示領域を確保する。
// この画像は見出し直下＝LCP候補になりうるため、loading="lazy"は付けない。
const articleRenderer = {
  image({ href, title, text }: { href: string; title: string | null; text: string }) {
    const alt = text ? ` alt="${text}"` : ''
    const titleAttr = title ? ` title="${title}"` : ''
    return `<img src="${href}"${alt}${titleAttr} width="1200" height="630" style="aspect-ratio:1200/630" decoding="async">`
  },
}

marked.use({ renderer: articleRenderer })

export async function renderArticleMarkdown(content: string): Promise<string> {
  return marked(content)
}
