import { describe, it, expect } from 'vitest'
import periodOfMonth from './index'

describe('periodOfMonth', () => {
  it('returns the first day of the month a date falls in', () => {
    expect(periodOfMonth('2026-09-23')).toBe('2026-09-01')
  })

  it('returns the date itself when it is already the first of the month', () => {
    expect(periodOfMonth('2026-09-01')).toBe('2026-09-01')
  })

  it('reads the last day of the month correctly', () => {
    expect(periodOfMonth('2026-09-30')).toBe('2026-09-01')
  })
})
