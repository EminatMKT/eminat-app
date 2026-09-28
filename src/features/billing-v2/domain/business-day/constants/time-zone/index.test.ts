import { describe, it, expect } from 'vitest'
import { formatInTimeZone } from 'date-fns-tz'
import { BUSINESS_TIME_ZONE, ISO_DAY, MIDNIGHT } from './index'

// 22:30 on the 23rd in Guayaquil, already the 24th in UTC.
const LATE_EVENING = new Date('2026-09-24T03:30:00Z')

describe('business-day time zone', () => {
  // Guayaquil runs five hours behind UTC all year: no daylight saving to move the split.
  it('counts days in a zone five hours behind UTC', () => {
    expect(formatInTimeZone(LATE_EVENING, BUSINESS_TIME_ZONE, ISO_DAY)).toBe('2026-09-23')
    expect(formatInTimeZone(LATE_EVENING, BUSINESS_TIME_ZONE, 'XXX')).toBe('-05:00')
  })

  // The pattern has to produce the same shape Postgres stores in a `date` column.
  it('formats a day as a date-only ISO string', () => {
    expect(formatInTimeZone(LATE_EVENING, BUSINESS_TIME_ZONE, ISO_DAY)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('names the first instant of a day', () => {
    expect(`2026-09-24${MIDNIGHT}`).toMatch(/T00:00:00$/)
  })
})
