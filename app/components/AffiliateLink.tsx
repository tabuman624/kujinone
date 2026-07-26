'use client'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export default function AffiliateLink({
  href,
  rel,
  className,
  style,
  label,
  sub,
  eventLabel,
}: {
  href: string
  rel: string
  className: string
  style?: React.CSSProperties
  label: string
  sub: string
  eventLabel: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel={rel}
      className={className}
      style={style}
      onClick={() => {
        window.gtag?.('event', 'affiliate_click', {
          link_label: eventLabel,
          page_path: window.location.pathname,
        })
      }}
    >
      <div className="flex-1">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs opacity-70">{sub}</p>
      </div>
      <span className="text-sm">↗</span>
    </a>
  )
}
