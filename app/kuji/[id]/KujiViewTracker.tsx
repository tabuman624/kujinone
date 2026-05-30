'use client'
import { useEffect } from 'react'

export default function KujiViewTracker({ kujiId }: { kujiId: number }) {
  useEffect(() => {
    const key = `kv_${kujiId}`
    const last = localStorage.getItem(key)
    const now = Date.now()
    if (!last || now - parseInt(last) >= 86_400_000) {
      fetch('/api/track-kuji-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kuji_id: kujiId }),
      })
      localStorage.setItem(key, String(now))
    }
  }, [kujiId])
  return null
}
