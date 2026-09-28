import { describe, it, expect } from 'vitest'
import dayOverflow from './index'

const entries = (count: number) => Array.from({ length: count }, (_, i) => `e${i}`)

describe('dayOverflow', () => {
  it('shows every entry and no control when they all fit', () => {
    expect(dayOverflow(entries(3), 3, false)).toEqual({ shown: entries(3), hidden: 0, folds: false })
  })

  // The «+N» takes a row of its own, so a full day shows one entry fewer than the cell holds and
  // the count covers the rest: the cell never needs a fourth row.
  it('keeps one row for the count and says how many it hides', () => {
    const { shown, hidden, folds } = dayOverflow(entries(10), 3, false)
    expect(shown).toEqual(['e0', 'e1'])
    expect(hidden).toBe(8)
    expect(folds).toBe(true)
  })

  it('hides nothing once the day is open, and still offers to fold it back', () => {
    expect(dayOverflow(entries(10), 3, true)).toEqual({ shown: entries(10), hidden: 0, folds: true })
  })

  it('never offers to fold a day that fits, open or not', () => {
    expect(dayOverflow(entries(2), 3, true).folds).toBe(false)
  })
})
