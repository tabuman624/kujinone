'use client'
import Script from 'next/script'

export default function A8Script() {
  return (
    <Script
      src="https://statics.a8.net/a8link/a8linkmgr.js"
      strategy="afterInteractive"
      onLoad={() => { (window as any).a8linkmgr({ config_id: 'xLVEUKG6qLmgP54TvR6L' }) }}
    />
  )
}
