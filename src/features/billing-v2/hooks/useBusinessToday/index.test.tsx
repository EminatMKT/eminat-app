import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import useBusinessToday from './index'

const LATE_EVENING_UTC = new Date('2026-09-24T03:30:00Z')
let seen: string | null = null

function Probe() {
  seen = useBusinessToday()
  return null
}

describe('useBusinessToday', () => {
  afterEach(() => { vi.useRealTimers() })

  // The first render already knows the day; it does not wait for an effect to fill it in.
  it('starts on the business day of Guayaquil', () => {
    vi.useFakeTimers()
    vi.setSystemTime(LATE_EVENING_UTC)
    renderToStaticMarkup(<Probe />)
    expect(seen).toBe('2026-09-23')
  })
})
