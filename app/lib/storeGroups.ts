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

export type StoreKuji = {
  id: number
  title: string
  price: number
  release_at: string | null
  image_url: string | null
}

export async function getStoreGroups(): Promise<Record<string, StoreKuji[]>> {
  const { data } = await supabase
    .from('kuji')
    .select('id, title, price, release_at, image_url, available_stores')
    .eq('is_active', true)

  const groups: Record<string, StoreKuji[]> = {}
  for (const k of data ?? []) {
    const stores: string[] = Array.isArray(k.available_stores) ? k.available_stores : []
    for (const [slug, name] of Object.entries(STORE_NAMES)) {
      if (!stores.includes(name)) continue
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
