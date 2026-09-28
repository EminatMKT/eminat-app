import { describe, it, expect } from 'vitest'
import { longDay, shortMoment } from './index'

// Saturday 26 September 2026, 17:47:06 — the moment the phone topbar was measured wrapping.
const MOMENT = new Date(2026, 8, 26, 17, 47, 6)
const YEAR = '2026'
const SECONDS = '06'

describe('longDay', () => {
  // The wide topbar keeps the whole day, weekday and year included, in the reader's language.
  it('names the weekday, the month and the year', () => {
    expect(longDay(MOMENT, 'es-EC')).toBe('sábado, 26 de septiembre de 2026')
    expect(longDay(MOMENT, 'en-US')).toBe('Saturday, September 26, 2026')
  })
})

describe('shortMoment', () => {
  // On a phone the whole day took five lines: the short form is day, month and time only.
  it('keeps the day, the month and the minute', () => {
    expect(shortMoment(MOMENT, 'es-EC')).toBe('26 sept, 5:47 p. m.')
    expect(shortMoment(MOMENT, 'en-US')).toBe('Sep 26, 5:47 PM')
  })

  // The year and the seconds are what made it long, and neither helps someone glancing at it.
  it('drops the year and the seconds', () => {
    expect(shortMoment(MOMENT, 'es-EC')).not.toContain(YEAR)
    expect(shortMoment(MOMENT, 'en-US')).not.toContain(SECONDS)
  })
})
