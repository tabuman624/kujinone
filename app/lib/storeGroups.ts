import { supabase } from './supabase'

// available_stores の実測値（is_active=163件、value>=15件のもののみページ化）。
// 「セブン‐イレブン店舗」のように全角ハイフンを含む表記があるため、
// 文字列は1kuji.com側の表記に厳密に合わせている。
export const STORE_NAMES: Record<string, string> = {
  lawson: 'ローソン',
  ministop: 'ミニストップ',
  familymart: 'ファミリーマート',
  seveneleven: 'セブン‐イレブン店舗',
  itoyokado: 'イトーヨーカドー店舗',
  yumetown: 'ゆめタウン店舗',
  dailyyamazaki: 'デイリーヤマザキ',
  hobbyshop: 'ホビーショップ',
  bookstore: '書店',
  'official-shop': '一番くじ公式ショップ',
  online: '一番くじONLINE',
}

// 公式の表記の揺れ（誤字）。2026-11時点で「ファミリマート」が1件（DEATH NOTE 2）。
const STORE_ALIASES: Record<string, string> = {
  'ファミリマート': 'familymart',
}

// 見出し・タイトル用の店名。検索では「イトーヨーカドー 一番くじ」のように「店舗」を付けずに探されるため。
const STORE_LABELS: Record<string, string> = {
  seveneleven: 'セブン-イレブン',
  itoyokado: 'イトーヨーカドー',
  yumetown: 'ゆめタウン',
}

export function storeLabel(slug: string): string {
  return STORE_LABELS[slug] ?? STORE_NAMES[slug]
}

// 検索に出す取扱店ページ（2026-11-15）。10/22 に全店を noindex にしたが、その前の3か月で
// イトーヨーカドー190表示・デイリーヤマザキ123表示（クリック率9.8%）など店名＋一番くじの検索があった。
// 書店・ホビーショップ・公式ショップはほぼ全部のくじを扱い /schedule と変わらないので、検索には出さない。
export const INDEXED_STORE_SLUGS = [
  'lawson', 'familymart', 'seveneleven', 'ministop', 'itoyokado', 'yumetown', 'dailyyamazaki', 'online',
]

export type StoreKuji = {
  id: number
  title: string
  price: number
  release_at: string | null
  image_url: string | null
}

export function storeSlugsFor(availableStores: string[]): string[] {
  const slugs = Object.entries(STORE_NAMES)
    .filter(([, name]) => availableStores.includes(name))
    .map(([slug]) => slug)
  for (const name of availableStores) {
    const slug = STORE_ALIASES[name]
    if (slug && !slugs.includes(slug)) slugs.push(slug)
  }
  return slugs
}

/** 取扱店の表記（available_stores の1件）→ 取扱店ページの slug。ページが無い店は null */
export function storeSlugForName(name: string): string | null {
  return storeSlugsFor([name])[0] ?? null
}

export async function getStoreGroups(): Promise<Record<string, StoreKuji[]>> {
  const { data } = await supabase
    .from('kuji')
    .select('id, title, price, release_at, image_url, available_stores')
    .eq('is_active', true)

  const groups: Record<string, StoreKuji[]> = {}
  for (const k of data ?? []) {
    const stores: string[] = Array.isArray(k.available_stores) ? k.available_stores : []
    for (const slug of storeSlugsFor(stores)) {
      ;(groups[slug] ??= []).push({
        id: k.id, title: k.title, price: k.price, release_at: k.release_at, image_url: k.image_url,
      })
    }
  }
  for (const slug in groups) {
    groups[slug].sort((a, b) => (a.release_at ?? '').localeCompare(b.release_at ?? ''))
  }
  return groups
}
