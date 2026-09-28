import { describe, it, expect } from 'vitest'
import shiftMonth from './index'

describe('shiftMonth', () => {
  it('steps forward across the year boundary', () => {
    expect(shiftMonth('2026-12-01', 1)).toBe('2027-01-01')
  })

  it('steps back across the year boundary', () => {
    expect(shiftMonth('2026-01-01', -1)).toBe('2025-12-01')
  })

  // A month is addressed by its first day, so stepping out of a long month must not land on the
  // 31st of a short one: February would answer March.
  it('always lands on the first day of the month', () => {
    expect(shiftMonth('2026-01-31', 1)).toBe('2026-02-01')
    expect(shiftMonth('2024-02-29', 12)).toBe('2025-02-01')
  })
})
