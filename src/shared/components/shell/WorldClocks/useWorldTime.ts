'use client'
import { useEffect, useState } from 'react'
import { anchoredUtc, serverTimeAnchor, type TimeAnchor } from './clock'

export default function useWorldTime() {
  const [now, setNow] = useState<Date | null>(null)
  const [source, setSource] = useState<'server' | 'device'>('device')

  useEffect(() => {
    let active = true
    let anchor: TimeAnchor = { utcMs: Date.now(), monotonicMs: performance.now() }
    let pending: AbortController | null = null
    const tick = () => { if (active) setNow(anchoredUtc(anchor, performance.now())) }
    const sync = async () => {
      if (pending) return
      const controller = new AbortController()
      pending = controller
      const timeout = window.setTimeout(() => controller.abort(), 5000)
      const sentAt = performance.now()
      try {
        const response = await fetch('/api/ui-time', { cache: 'no-store', signal: controller.signal })
        if (!response.ok) return
        const payload: { utcMs?: unknown } = await response.json()
        const sample = serverTimeAnchor(payload.utcMs, sentAt, performance.now())
        if (active && sample) {
          anchor = sample
          setSource('server')
          tick()
        }
      } catch {
        // Keep the last valid sample (device time only until the first successful sync).
      } finally {
        window.clearTimeout(timeout)
        if (pending === controller) pending = null
      }
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') { tick(); void sync() } }
    tick()
    void sync()
    const timer = window.setInterval(tick, 1000)
    const refresh = window.setInterval(() => { if (document.visibilityState === 'visible') void sync() }, 300000)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      pending?.abort()
      window.clearInterval(timer)
      window.clearInterval(refresh)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
  return { now, source }
}
