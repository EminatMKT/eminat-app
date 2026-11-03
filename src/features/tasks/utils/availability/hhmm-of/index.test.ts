import { describe, expect, it } from 'vitest'
import hhmmOf from '.'

describe('hhmmOf', () => {
  it('pads single-digit hours and minutes to two digits', () => {
    expect(hhmmOf(5)).toBe('00:05')
  })

  it('formats a full morning time with no padding needed', () => {
    expect(hhmmOf(9 * 60 + 30)).toBe('09:30')
  })

  it('formats midnight and the last representable minute of the day', () => {
    expect(hhmmOf(0)).toBe('00:00')
    expect(hhmmOf(23 * 60 + 59)).toBe('23:59')
  })

  it('round-trips back to the same value minutesOf would have parsed', () => {
    expect(hhmmOf(17 * 60)).toBe('17:00')
  })
})
