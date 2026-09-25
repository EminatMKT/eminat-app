import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import watchDay from './index'

const HOUR = 3_600_000
const BEFORE_MIDNIGHT = new Date('2026-09-24T04:00:00Z')

// A page built on a real `EventTarget`, so only the event a browser fires on resume reaches the
// listener: a watcher subscribed to the wrong event name hears nothing and the tests below fail.
const fakePage = () => {
  const target = new EventTarget()
  const page = {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: (type: string, fn: () => void) => target.addEventListener(type, fn),
    removeEventListener: (type: string, fn: () => void) => target.removeEventListener(type, fn),
    resume: () => target.dispatchEvent(new Event('visibilitychange')),
  }
  return page
}

describe('watchDay', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(BEFORE_MIDNIGHT) })
  afterEach(() => { vi.useRealTimers() })

  it('reports the new business day once, when the day turns', () => {
    const seen: string[] = []
    watchDay((day) => seen.push(day), fakePage())
    vi.advanceTimersByTime(HOUR - 1)
    expect(seen).toEqual([])
    vi.advanceTimersByTime(1)
    expect(seen).toEqual(['2026-09-24'])
  })

  // A laptop that slept through midnight wakes up with a stale day; coming back re-reads it.
  it('reads the day again when the page comes back into view', () => {
    const seen: string[] = []
    const page = fakePage()
    watchDay((day) => seen.push(day), page)
    vi.setSystemTime(new Date('2026-09-26T15:00:00Z'))
    page.resume()
    expect(seen).toEqual(['2026-09-26'])
  })

  it('ignores a visibility change that hides the page', () => {
    const seen: string[] = []
    const page = fakePage()
    page.visibilityState = 'hidden'
    watchDay((day) => seen.push(day), page)
    page.resume()
    expect(seen).toEqual([])
  })

  it('stops listening and stops the timer once it is released', () => {
    const seen: string[] = []
    const page = fakePage()
    watchDay((day) => seen.push(day), page)()
    vi.advanceTimersByTime(2 * HOUR)
    page.resume()
    expect(seen).toEqual([])
  })
})
