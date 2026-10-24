import { buildUrlsetXml, xmlResponse } from '../lib/sitemapXml'

export const revalidate = 3600

const BASE = 'https://kujinone.com'

// /store/[slug]はnoindexにした（3か月表示0、/scheduleの部分集合。ADSENSE_SPEC
// 「薄いページのnoindex化」判断）。noindexページをsitemapに載せると矛盾した
// シグナルになるため、/store一覧のみを残す。
export async function GET() {
  const entries = [
    { url: `${BASE}/store`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.5 },
  ]

  return xmlResponse(buildUrlsetXml(entries))
}
