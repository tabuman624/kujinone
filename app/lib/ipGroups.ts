import { supabase } from './supabase'

// product_id は1kuji.comのスラッグで、末尾の連番・再販売サフィックスを落とすと
// 作品キーになる（実測で163件中163件が非null）。タイトル文字列からのIP抽出は
// 区切り文字や表記揺れで失敗するため、product_id が唯一信頼できるIPキー。
//
// 自動グルーピングした結果、2件以上のくじを持つ作品キーは31件（実測）。
// ここに無い作品キーは表示名が無くページを作らない（新作品が2件目に達したら
// 都度ここに追加する運用）。
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

  const groups: Record<string, IpKuji[]> = {}
  for (const k of data ?? []) {
    const slug = ipSlugFor(k.product_id as string)
    if (!IP_NAMES[slug]) continue
    ;(groups[slug] ??= []).push({
      id: k.id, title: k.title, price: k.price, release_at: k.release_at, image_url: k.image_url,
    })
  }
  for (const slug in groups) {
    // release_atがnull(発売日未定)のくじは先頭に寄せておく。表示側で reverse()
    // する運用のため、最終的には一覧の最後に表示される。
    groups[slug].sort((a, b) => (a.release_at ?? '').localeCompare(b.release_at ?? ''))
  }
  return groups
}
