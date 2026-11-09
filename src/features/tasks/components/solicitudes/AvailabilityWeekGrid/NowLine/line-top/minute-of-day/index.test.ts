import { describe, expect, it } from 'vitest'
import minuteOfDay from '.'

const MIDNIGHT = '2026-11-09T00:00:00'
const HALF_PAST_TWO_PM = '2026-11-09T14:30:45'
const LAST_MINUTE = '2026-11-09T23:59:00'

describe('minuteOfDay', () => {
  it('is zero at local midnight', () => {
    expect(minuteOfDay(new Date(MIDNIGHT))).toBe(0)
  })

  it('counts whole minutes since local midnight, ignoring seconds', () => {
    expect(minuteOfDay(new Date(HALF_PAST_TWO_PM))).toBe(870)
  })

  it('reaches 1439 on the last minute of the day', () => {
    expect(minuteOfDay(new Date(LAST_MINUTE))).toBe(1439)
  })
})
