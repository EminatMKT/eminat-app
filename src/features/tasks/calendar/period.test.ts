import { describe, expect, it, vi, afterEach } from 'vitest'
import { addDays, dateFromKey, dateKey, movePeriod, period, todayKey } from './period'

afterEach(() => vi.useRealTimers())

describe('calendar DATE periods', () => {
  it('covers the month grid from Monday through Sunday', () => {
    const month = period('2026-10-12', 'month')
    expect([month.first, month.last, month.days.length]).toEqual(['2026-09-28', '2026-11-01', 35])
    expect(month.days).toContain('2026-10-12')
  })
  it('covers exactly one week and navigates both modes', () => {
    expect(period('2026-10-12', 'week').days).toEqual([
      '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18',
    ])
    expect(movePeriod('2026-10-12', 'week', -1)).toBe('2026-10-05')
    expect(movePeriod('2026-10-31', 'month', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
  it('keeps a DATE on its local day near UTC midnight', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-05T02:30:00Z')) // Oct 4 in Guayaquil
    expect(todayKey()).toBe('2026-10-04')
    expect(dateKey(dateFromKey('2026-10-04'))).toBe('2026-10-04')
  })
})
