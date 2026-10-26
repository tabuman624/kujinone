// 閲覧数・注目度など、閲覧のたびに変わるカウンターをブラウザから直接取得する。
// これらをサーバー側でHTMLに埋め込むと、ISR再生成のたびに内容が変わったと判定され
// Vercel ISR Writesが毎回発生する（中身が同じなら書き込みはカウントされない仕様）。
// Vercelの関数を経由しないよう、Supabase REST APIを直接叩く（supabase-jsをクライアント
// バンドルに含めないため素のfetchを使う）。
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function restSelect<T>(table: string, query: string): Promise<T[] | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    })
    if (!res.ok) return null
    return (await res.json()) as T[]
  } catch {
    return null
  }
}

export async function fetchViewCounts(kujiIds: number[]): Promise<Record<number, number> | null> {
  if (!kujiIds.length) return {}
  const rows = await restSelect<{ kuji_id: number; view_count: number }>(
    'kuji_views',
    `select=kuji_id,view_count&kuji_id=in.(${kujiIds.join(',')})`,
  )
  if (!rows) return null
  return Object.fromEntries(rows.map(r => [r.kuji_id, r.view_count]))
}

export async function fetchInterestCounts(prizeIds: number[]): Promise<Record<number, number> | null> {
  if (!prizeIds.length) return {}
  const rows = await restSelect<{ prize_id: number; check_count: number }>(
    'prize_interest',
    `select=prize_id,check_count&prize_id=in.(${prizeIds.join(',')})`,
  )
  if (!rows) return null
  return Object.fromEntries(rows.map(r => [r.prize_id, r.check_count]))
}
