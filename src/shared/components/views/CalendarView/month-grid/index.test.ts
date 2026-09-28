import { describe, it, expect } from 'vitest'
import buildMonthGrid from './index'

const last = (grid: readonly string[]) => grid[grid.length - 1]

describe('buildMonthGrid', () => {
  // September 2026 starts on a Tuesday and ends on a Wednesday, so the page borrows two days
  // from August and three from October. Those borrowed days are part of the grid, not padding
  // to be hidden: a record on the 31st of August has to be visible from the September page.
  it('crosses into the previous and the next month', () => {
    const grid = buildMonthGrid('2026-09-01')
    expect(grid[0]).toBe('2026-08-30')
    expect(last(grid)).toBe('2026-10-03')
    expect(grid.length % 7).toBe(0)
  })

  it('covers every day of a leap February', () => {
    const grid = buildMonthGrid('2024-02-01')
    expect(grid).toContain('2024-02-29')
    expect(grid[0]).toBe('2024-01-28')
    expect(last(grid)).toBe('2024-03-02')
  })

  it('crosses the year boundary from December into January', () => {
    const grid = buildMonthGrid('2026-12-01')
    expect(grid[0]).toBe('2026-11-29')
    expect(last(grid)).toBe('2027-01-02')
  })

  // February 2026 runs Sunday to Saturday exactly, which is the case where a grid built by
  // counting weeks instead of by whole weeks grows a phantom row.
  it('borrows nothing when the month already fills its weeks', () => {
    const grid = buildMonthGrid('2026-02-01')
    expect(grid).toHaveLength(28)
    expect(grid[0]).toBe('2026-02-01')
    expect(last(grid)).toBe('2026-02-28')
  })

  it('reads the month from the first day it is given, not from today', () => {
    expect(buildMonthGrid('2026-05-01')).toContain('2026-05-31')
  })
})
