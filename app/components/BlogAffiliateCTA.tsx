import AffiliateLink from './AffiliateLink'

// くじ詳細ページ(app/kuji/[id]/page.tsx)と同じリンク・rel・報酬構造を、
// 特定の商品に紐づかないコラム記事向けに一般キーワードで提供する。
// これらのコラムは「相場と比較して判断しよう」「駿河屋の買取がラク」と
// 本文で明言しているのに、これまで外部リンクが1本も無かった。
const GENERIC_KEYWORD = '一番くじ'

const COMPARE_LINKS = [
  {
    href: `https://px.a8.net/svt/ejp?a8mat=4B3MEQ+DIF6SA+5LNQ+5YJRM&a8ejpredirect=${encodeURIComponent(`https://jp.mercari.com/search?keyword=${encodeURIComponent(GENERIC_KEYWORD)}`)}`,
    label: 'メルカリで相場を見る【PR】',
    sub: '出品価格を確認',
    color: 'bg-shu-bg border-shu text-shu',
    rel: 'noopener noreferrer nofollow sponsored',
  },
  {
    href: `https://affiliate.suruga-ya.jp/modules/af/af_jump.php?user_id=5303&goods_url=https%3A%2F%2Fwww.suruga-ya.jp%2Fsearch%3Fsearch_word%3D${encodeURIComponent(GENERIC_KEYWORD)}`,
    label: '駿河屋で相場を見る【PR】',
    sub: '在庫あり最安値を確認',
    color: 'bg-blue-50 border-blue-200 text-blue-600',
    rel: 'nofollow noopener noreferrer',
  },
]

const SURUGA_KAITORI_URL = `https://affiliate.suruga-ya.jp/modules/af/af_jump.php?user_id=5303&goods_url=${encodeURIComponent('https://www.suruga-ya.jp/man/kaitori/kaitoritop.html')}`

export function CompareCTA() {
  return (
    <div className="px-5 pb-6 border-t border-stone-100 pt-6">
      <h2 className="text-xs font-black text-stone-400 tracking-wider mb-3">相場を確認する / MARKET</h2>
      <div className="space-y-2">
        {COMPARE_LINKS.map(link => (
          <AffiliateLink
            key={link.href}
            href={link.href}
            rel={link.rel}
            className={`flex items-center gap-3 p-3 border rounded-xl ${link.color} press`}
            label={link.label}
            sub={link.sub}
            eventLabel={`${link.label}_blog`}
          />
        ))}
      </div>
    </div>
  )
}

export function SellCTA() {
  return (
    <div className="px-5 pb-6 border-t border-stone-100 pt-6">
      <h2 className="text-xs font-black text-stone-400 tracking-wider mb-3">売る / SELL</h2>
      <AffiliateLink
        href={SURUGA_KAITORI_URL}
        rel="nofollow noopener noreferrer"
        className="flex items-center gap-3 p-3 border rounded-xl bg-green-50 border-green-200 text-green-700 press"
        label="駿河屋に売る【PR】"
        sub="宅配・出張買取に対応、査定無料"
        eventLabel="駿河屋に売る_blog"
      />
    </div>
  )
}
