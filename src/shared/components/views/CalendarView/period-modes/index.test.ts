import { describe, it, expect } from 'vitest'
import periodModes from './index'

const { month } = periodModes

describe('periodModes', () => {
  // The grid is chosen by the mode: a month page is whole weeks around the month.
  it('lays out a month page in whole weeks around the month', () => {
    const days = month.days('2026-09-01')
    expect(days[0]).toBe('2026-08-30')
    expect(days[days.length - 1]).toBe('2026-10-03')
  })

  // One step of the arrows is one period of the mode, across a year boundary too.
  it('moves by one whole period in either direction', () => {
    expect(month.step('2026-12-01', 1)).toBe('2027-01-01')
    expect(month.step('2026-12-01', -1)).toBe('2026-11-01')
  })

  it('names the period on screen in the locale it is given', () => {
    expect(month.name('2026-09-01', 'en-US')).toBe('September 2026')
  })
})
