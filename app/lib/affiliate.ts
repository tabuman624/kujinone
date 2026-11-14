// アフィリエイトのリンク先。メルカリは A8（メルカリアンバサダー）の経由リンクで、検索結果のページへ飛ばす。
const MERCARI_A8 = 'https://px.a8.net/svt/ejp?a8mat=4B3MEQ+DIF6SA+5LNQ+5YJRM&a8ejpredirect='

export function mercariSearchUrl(keyword: string): string {
  return `${MERCARI_A8}${encodeURIComponent(`https://jp.mercari.com/search?keyword=${encodeURIComponent(keyword)}`)}`
}
