'use client'

// 文字や行をそのままアフィリエイトのリンクにするときの部品。押されたら AffiliateLink と同じ affiliate_click を送る。
// AffiliateLink はボタンの見た目が決まっているので、表の行などにはこちらを使う。
export default function AffiliateAnchor({
  href,
  className,
  eventLabel,
  children,
}: {
  href: string
  className?: string
  eventLabel: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored nofollow"
      className={className}
      onClick={() => {
        window.gtag?.('event', 'affiliate_click', {
          link_label: eventLabel,
          page_path: window.location.pathname,
        })
      }}
    >
      {children}
    </a>
  )
}
