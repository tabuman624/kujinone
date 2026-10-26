import { supabase } from '../../lib/supabase'
import PrizePopularityLive from './PrizePopularityLive'

type Prize = { id: number; name: string; grade: string }

// 閲覧数は一桁〜十数回の表示が大半（中央値8回、実測で56%が10回以下）で、
// 絶対値をそのまま出すと「ユーザーの関心を集めている」ことの反証になりかねない。
// ある程度まとまった回数になってから初めて意味のある数字として表示する。
const VIEW_COUNT_DISPLAY_THRESHOLD = 50

// サーバー側では「欄を出すかどうか」だけを決め、数値そのものはブラウザで取得する
// （PrizePopularityLive / app/lib/liveCounts.ts）。数値をHTMLに埋め込むと閲覧のたびに
// ページ内容が変わり、ISR再生成のたびにVercel ISR Writesが発生するため。
// 表示可否の判定はどちらも単調増加カウンターの閾値なので、一度trueになれば変わらない。
export type PopularityFlags = { showViewCount: boolean; hasInterest: boolean }

// データ取得はページ側でまとめて行い、コンポーネントは同期描画にする（PriceSparklineのコメント参照）。
export async function loadPopularityFlags(kujiId: number, prizeIds: number[]): Promise<PopularityFlags> {
  if (!prizeIds.length) return { showViewCount: false, hasInterest: false }
  const [{ data: interests }, { data: viewData }] = await Promise.all([
    supabase
      .from('prize_interest')
      .select('prize_id, check_count')
      .in('prize_id', prizeIds),
    supabase
      .from('kuji_views')
      .select('view_count')
      .eq('kuji_id', kujiId)
      .maybeSingle(),
  ])
  return {
    showViewCount: (viewData?.view_count ?? 0) >= VIEW_COUNT_DISPLAY_THRESHOLD,
    hasInterest: interests?.some(i => (i.check_count as number) > 0) ?? false,
  }
}

export default function PrizePopularity({ kujiId, prizes, flags }: { kujiId: number; prizes: Prize[]; flags: PopularityFlags }) {
  if (!prizes.length) return null
  const { showViewCount, hasInterest } = flags
  if (!hasInterest && !showViewCount) return null

  return (
    <PrizePopularityLive
      kujiId={kujiId}
      prizes={prizes}
      showViewCount={showViewCount}
      hasInterest={hasInterest}
    />
  )
}
