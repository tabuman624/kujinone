"use client"

import { useEffect, useState } from "react"

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, height: 2, background: "rgba(0,0,0,0.05)" }}>
      <div style={{ height: "100%", width: `${progress * 100}%`, background: "#dc2626", transition: "width 80ms linear" }} />
    </div>
  )
}
