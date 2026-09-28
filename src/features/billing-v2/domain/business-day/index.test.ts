import { describe, it, expect } from 'vitest'
import businessDay from './index'

const HOUR = 3_600_000
const LATE_EVENING = new Date('2026-09-24T03:30:00Z')
const JUST_AFTER_MIDNIGHT = new Date('2026-09-24T05:00:00Z')
const ONE_HOUR_BEFORE = new Date('2026-09-24T04:00:00Z')
const NEW_YEAR_EVE = new Date('2027-01-01T04:59:59Z')

describe('businessDay', () => {
  // UTC has already turned the page; Guayaquil has not.
  it('reads today on the Guayaquil calendar, not on the UTC one', () => {
    expect(businessDay.today(LATE_EVENING)).toBe('2026-09-23')
    expect(businessDay.today(JUST_AFTER_MIDNIGHT)).toBe('2026-09-24')
  })

  it('crosses the year boundary with the business calendar', () => {
    expect(businessDay.today(NEW_YEAR_EVE)).toBe('2026-12-31')
  })

  it('counts the time left until the next business day starts', () => {
    expect(businessDay.msUntilNext(ONE_HOUR_BEFORE)).toBe(HOUR)
    expect(businessDay.msUntilNext(NEW_YEAR_EVE)).toBe(1000)
  })
})
