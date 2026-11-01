// スケジュールのカードに出す取扱店ラベルと、店舗フィルタの定義。
// available_stores の文字列は1kuji.com側の表記（app/lib/storeGroups.ts の STORE_NAMES と同じ）。

// 表示名を短くし、コンビニを先頭に並べる。ここに無い店名（Nintendo TOKYO 等）はそのまま後ろに出す。
const SHORT_LABELS: [string, string][] = [
  ['ローソン', 'ローソン'],
  ['セブン‐イレブン店舗', 'セブン'],
  ['ファミリーマート', 'ファミマ'],
  ['ミニストップ', 'ミニストップ'],
  ['デイリーヤマザキ', 'デイリー'],
  ['その他コンビニエンスストア', 'その他コンビニ'],
  ['イトーヨーカドー店舗', 'ヨーカドー'],
  ['ゆめタウン店舗', 'ゆめタウン'],
  ['一部のドラッグストア', 'ドラッグストア'],
  ['書店', '書店'],
  ['ホビーショップ', 'ホビー'],
  ['一番くじ公式ショップ', '公式ショップ'],
  ['一番くじONLINE', 'オンライン'],
]

const ORDER = new Map(SHORT_LABELS.map(([name], i) => [name, i]))
const LABEL = new Map(SHORT_LABELS)

export const MAX_STORE_CHIPS = 5

export function storeLabels(stores: string[]): string[] {
  return [...stores]
    .sort((a, b) => (ORDER.get(a) ?? 99) - (ORDER.get(b) ?? 99))
    .map(s => LABEL.get(s) ?? s)
}

// 店舗フィルタ。key は data-stores 属性に入れる英字キー。
export const STORE_FILTERS: { key: string; label: string; name: string }[] = [
  { key: 'lawson', label: 'ローソン', name: 'ローソン' },
  { key: 'seven', label: 'セブン', name: 'セブン‐イレブン店舗' },
  { key: 'famima', label: 'ファミマ', name: 'ファミリーマート' },
  { key: 'ministop', label: 'ミニストップ', name: 'ミニストップ' },
  { key: 'online', label: 'オンライン', name: '一番くじONLINE' },
]

export function storeFilterKeys(stores: string[]): string[] {
  return STORE_FILTERS.filter(f => stores.includes(f.name)).map(f => f.key)
}
