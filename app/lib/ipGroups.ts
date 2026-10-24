import { supabase } from './supabase'

// product_id は1kuji.comのスラッグで、末尾の連番・再販売サフィックスを落とすと
// 作品キーになる（実測で163件中163件が非null）。タイトル文字列からのIP抽出は
// 区切り文字や表記揺れで失敗するため、product_id が唯一信頼できるIPキー。
//
// 自動グルーピングした結果、2件以上のくじを持つ作品キーは36件（2026-10-25実測）。
// ここに無い作品キーは表示名が無くページを作らない（新作品が2件目に達したら
// 都度ここに追加する運用）。この運用は2026-09-06の初版以降一度も行われず、
// 5件（aikatsu/bluearchive/kusuriya/eva/lilalamode）が未登録のまま放置されていた
// のを2026-10-25に発見・backfill。以後はgetIpGroups()の警告ログで気づける。
const IP_ALIASES: Record<string, string> = {
  vigilante: 'myhero', // 「ヴィジランテ -僕のヒーローアカデミア ILLEGALS-」
}

export const IP_NAMES: Record<string, string> = {
  disney: 'ディズニー',
  onep: 'ワンピース',
  db: 'ドラゴンボール',
  myhero: '僕のヒーローアカデミア',
  gundam: '機動戦士ガンダム',
  hololive: 'ホロライブ',
  hxh: 'HUNTER×HUNTER',
  shingeki: '進撃の巨人',
  jujutsu: '呪術廻戦',
  godzilla: 'ゴジラ',
  tamagotchi: 'たまごっち',
  jojo: 'ジョジョの奇妙な冒険',
  nikke: '勝利の女神：NIKKE',
  ppg: 'パワーパフガールズ',
  shinchan: 'クレヨンしんちゃん',
  pk30th: 'Pokémon 30th ANNIVERSARY',
  bleach: 'BLEACH',
  mario: 'スーパーマリオ',
  natsume: '夏目友人帳',
  slime: '転生したらスライムだった件',
  yuhaku: '幽☆遊☆白書',
  streetfighter: 'ストリートファイター',
  chainsawman: 'チェンソーマン',
  precure: 'プリキュア',
  umamusume: 'ウマ娘 プリティーダービー',
  kingdom: 'キングダム',
  naruto: 'NARUTO-ナルト-',
  sakura: 'カードキャプターさくら',
  kimetsu: '鬼滅の刃',
  gkmas: '学園アイドルマスター',
  obungu: 'お文具といっしょ',
  aikatsu: 'アイカツ！',
  bluearchive: 'ブルーアーカイブ',
  kusuriya: '薬屋のひとりごと',
  eva: 'ヱヴァンゲリヲン新劇場版',
  lilalamode: 'Lil ala mode',
}

export function ipSlugFor(productId: string): string {
  const base = productId.split(/[_-]/)[0].replace(/\d+$/, '')
  return IP_ALIASES[base] ?? base
}

export type IpKuji = {
  id: number
  title: string
  price: number
  release_at: string | null
  image_url: string | null
}

export async function getIpGroups(): Promise<Record<string, IpKuji[]>> {
  const { data } = await supabase
    .from('kuji')
    .select('id, title, price, release_at, image_url, product_id')
    .eq('is_active', true)

  const allBySlug: Record<string, IpKuji[]> = {}
  for (const k of data ?? []) {
    const slug = ipSlugFor(k.product_id as string)
    ;(allBySlug[slug] ??= []).push({
      id: k.id, title: k.title, price: k.price, release_at: k.release_at, image_url: k.image_url,
    })
  }

  // IP_NAMESは人手で追加する運用のため、登録を忘れると気づかれず放置される
  // （2026-09-06の初版から2026-10-25まで一度も更新されず5件取り残されていた実績あり）。
  // 追加の監視サービスは使わず、Vercelのファンクションログに出すだけの受動的な仕組みで検知する。
  const unmapped = Object.entries(allBySlug).filter(([slug, items]) => items.length >= 2 && !IP_NAMES[slug])
  if (unmapped.length > 0) {
    console.warn(
      `[ipGroups] IP_NAMES未登録のまま2件以上のくじを持つ作品キー: ${unmapped.map(([slug, items]) => `${slug}(${items.length}件)`).join(', ')}`
    )
  }

  const groups: Record<string, IpKuji[]> = {}
  for (const [slug, items] of Object.entries(allBySlug)) {
    if (!IP_NAMES[slug]) continue
    groups[slug] = items
  }
  for (const slug in groups) {
    // release_atがnull(発売日未定)のくじは先頭に寄せておく。表示側で reverse()
    // する運用のため、最終的には一覧の最後に表示される。
    groups[slug].sort((a, b) => (a.release_at ?? '').localeCompare(b.release_at ?? ''))
  }
  return groups
}
