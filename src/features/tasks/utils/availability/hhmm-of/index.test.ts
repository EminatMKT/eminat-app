import { describe, expect, it } from 'vitest'
import hhmmOf from '.'

describe('hhmmOf', () => {
  it('pads single-digit hours and minutes to two digits', () => {
    const fiveMinutesPastMidnight = '00:05'

    expect(hhmmOf(5)).toBe(fiveMinutesPastMidnight)
  })

  it('formats a full morning time with no padding needed', () => {
    const halfPastNine = '09:30'

    expect(hhmmOf(9 * 60 + 30)).toBe(halfPastNine)
  })

  it('formats midnight and the last representable minute of the day', () => {
    const midnight = '00:00'
    const lastMinute = '23:59'

    expect(hhmmOf(0)).toBe(midnight)
    expect(hhmmOf(23 * 60 + 59)).toBe(lastMinute)
  })

  it('round-trips back to the same value minutesOf would have parsed', () => {
    const fivePm = '17:00'

    expect(hhmmOf(17 * 60)).toBe(fivePm)
  })
})
