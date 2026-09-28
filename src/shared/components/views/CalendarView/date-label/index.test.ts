import { describe, it, expect } from 'vitest'
import dateLabel from './index'

describe('dateLabel', () => {
  it('spells the month and the year of the page a date belongs to', () => {
    expect(dateLabel('2026-12-01', 'en-US').month).toBe('December 2026')
  })

  // The weekday belongs in the day label: on a grid a cell is told apart by where it sits in
  // the week as much as by its number, and a screen reader never sees the column.
  it('spells a whole day, weekday first', () => {
    expect(dateLabel('2026-08-30', 'en-US').day).toBe('Sunday, August 30, 2026')
  })

  it('gives the bare number a cell draws, with no leading zero', () => {
    expect(dateLabel('2026-09-05', 'en-US').number).toBe('5')
  })

  // Read as UTC, a date-only string lands on the previous day in a negative offset — which is
  // every timezone this app runs in.
  it('reads the string in local time, so the first of the month stays the first', () => {
    expect(dateLabel('2026-09-01', 'en-US').day).toContain('September 1')
  })

  it('follows the locale it is handed', () => {
    expect(dateLabel('2026-12-01', 'es-ES').month).toContain('diciembre')
  })
})
