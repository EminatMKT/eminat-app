import { afterEach, expect, it, vi } from 'vitest'
import { GET, dynamic } from './route'

afterEach(() => vi.useRealTimers())
it('returns fresh server UTC without caching or accessing application data', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-01T12:00:00Z'))
  const first = GET()
  expect(dynamic).toBe('force-dynamic')
  expect(first.headers.get('cache-control')).toContain('no-store')
  expect(await first.json()).toEqual({ utcMs: Date.now() })
  vi.advanceTimersByTime(60000)
  expect(await GET().json()).toEqual({ utcMs: Date.now() })
})
