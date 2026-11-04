import { renderOgCard, OG_SIZE } from '../lib/ogCard'

// /data のシェア画像。X の豆知識の返信リンクのカードに出る。数字は毎日変わるので入れない。
export const alt = 'データで見る一番くじ'
export const size = OG_SIZE
export const contentType = 'image/png'

export default async function Image() {
  return renderOgCard({ eyebrow: 'データ', title: 'データで見る一番くじ', sub: '発売曜日・販売店・相場を、毎日のデータから集計' })
}
