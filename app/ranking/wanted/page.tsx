import type { Metadata } from 'next'
import { supabase } from '../../lib/supabase'
import RankingTabs, { type TotalRankingItem, type WeeklyRankingItem } from './RankingTabs'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '人気ランキング｜みんなが狙っている賞・週間急上昇くじ',
  description: '一番くじの期待値計算ツールで実際にチェックされた回数をもとにした総合ランキングと、直近1週間の閲覧数の伸びをもとにした週間急上昇ランキング。ヤフオク相場もあわせてチェックできます。',
  alternates: { canonical: '/ranking/wanted' },
}

export default async function WantedRankingPage() {
  const today = new Date().toISOString().slice(0, 10)

  // ── 総合: 期待値計算でチェックされた回数（全期間の累積）───────────────────
  const { data: interests } = await supabase
    .from('prize_interest')
    .select('prize_id, check_count')
    .gt('check_count', 0)
    .order('check_count', { ascending: false })
    .limit(50)

  const prizeIds = (interests ?? []).map(i => i.prize_id)
  const { data: prizes } = prizeIds.length > 0
    ? await supabase.from('prizes').select('id, name, grade, kuji_id, image_url, auction_price_peak, auction_price_updated_at').in('id', prizeIds)
    : { data: [] as Array<{ id: number; name: string; grade: string; kuji_id: number; image_url: string | null; auction_price_peak: number | null; auction_price_updated_at: string | null }> }

  const kujiIds = [...new Set((prizes ?? []).map(p => p.kuji_id))]
  const { data: kujiList } = kujiIds.length > 0
    ? await supabase.from('kuji').select('id, title, release_at').in('id', kujiIds)
    : { data: [] as Array<{ id: number; title: string; release_at: string | null }> }

  const prizeMap = Object.fromEntries((prizes ?? []).map(p => [p.id, p]))
  const kujiTitleMap = Object.fromEntries((kujiList ?? []).map(k => [k.id, k.title as string]))
  const kujiReleaseMap = Object.fromEntries((kujiList ?? []).map(k => [k.id, k.release_at as string | null]))

  const totalRanking: TotalRankingItem[] = (interests ?? [])
    .map(i => {
      const prize = prizeMap[i.prize_id]
      if (!prize) return null
      // 未発売のくじには二次流通が存在しないため、相場データが付いていても
      // ランキングには出さない（ラベルなど誤情報の露出を避ける）
      const releaseAt = kujiReleaseMap[prize.kuji_id]
      if (!releaseAt || releaseAt > today) return null
      return { ...prize, checkCount: i.check_count as number, kujiTitle: kujiTitleMap[prize.kuji_id] ?? '' }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .slice(0, 30)

  // ── 週間急上昇: kuji_views_daily の直近スナップショットの差分 ──────────────
  // kuji_views自体はタイムスタンプを持たない累積カウンタのため、日次スナップショット
  // （kuji_views_daily）の中で一番古い値と一番新しい値の差分を「今週の伸び」とする。
  const tenDaysAgoDate = new Date()
  tenDaysAgoDate.setDate(tenDaysAgoDate.getDate() - 10)
  const tenDaysAgo = tenDaysAgoDate.toISOString().slice(0, 10)

  // Supabase(PostgREST)は1リクエストあたり最大1,000行で、.limit()では超えられない
  // （サーバー側のmax-rows設定）。kuji総数×10日分で1,000行を超えるため、.range()で
  // ページングしないと直近日付が静かに切れて「最新」が古くなる。
  const dailySnapshots: Array<{ kuji_id: number; view_count: number; recorded_at: string }> = []
  for (let page = 0; page < 10; page++) {
    const { data: batch } = await supabase
      .from('kuji_views_daily')
      .select('kuji_id, view_count, recorded_at')
      .gte('recorded_at', tenDaysAgo)
      .order('recorded_at', { ascending: true })
      .range(page * 1000, page * 1000 + 999)
    if (!batch || batch.length === 0) break
    dailySnapshots.push(...batch)
    if (batch.length < 1000) break
  }

  const firstSeen: Record<number, number> = {}
  const lastSeen: Record<number, number> = {}
  for (const row of dailySnapshots ?? []) {
    const kujiId = row.kuji_id as number
    if (!(kujiId in firstSeen)) firstSeen[kujiId] = row.view_count as number
    lastSeen[kujiId] = row.view_count as number
  }

  const weeklyDeltas = Object.keys(lastSeen)
    .map(idStr => {
      const id = Number(idStr)
      return { kujiId: id, delta: lastSeen[id] - (firstSeen[id] ?? 0) }
    })
    .filter(d => d.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 50)

  const weeklyKujiIds = weeklyDeltas.map(d => d.kujiId)
  const { data: weeklyKujiList } = weeklyKujiIds.length > 0
    ? await supabase.from('kuji').select('id, title, price, image_url, banner_url, release_at').in('id', weeklyKujiIds)
    : { data: [] as Array<{ id: number; title: string; price: number; image_url: string | null; banner_url: string | null; release_at: string | null }> }

  const weeklyKujiMap = Object.fromEntries((weeklyKujiList ?? []).map(k => [k.id, k]))

  const weeklyRanking: WeeklyRankingItem[] = weeklyDeltas
    .map(d => {
      const kuji = weeklyKujiMap[d.kujiId]
      if (!kuji) return null
      if (!kuji.release_at || kuji.release_at > today) return null
      return { id: kuji.id, title: kuji.title, price: kuji.price, image_url: kuji.image_url, banner_url: kuji.banner_url, delta: d.delta }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .slice(0, 20)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://kujinone.com' },
      { '@type': 'ListItem', position: 2, name: '人気ランキング', item: 'https://kujinone.com/ranking/wanted' },
    ],
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="bg-stone-800 px-6 py-8 text-white">
        <p className="text-xs font-bold tracking-widest text-stone-400 mb-1">RANKING</p>
        <h1 className="text-xl font-black">人気ランキング</h1>
        <p className="text-xs text-stone-400 mt-2">総合は期待値計算でチェックされた回数、週間急上昇は直近1週間の閲覧数の伸びをもとにしています</p>
      </div>

      <RankingTabs totalRanking={totalRanking} weeklyRanking={weeklyRanking} />
    </main>
  )
}
