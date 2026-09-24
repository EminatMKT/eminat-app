import { describe, it, expect } from 'vitest'
import joinLine from './index'

const FIRST = 'Payroll'
const SECOND = 'Sep 30, 2026'

describe('joinLine', () => {
  it('joins the pieces of a line with one separator', () => {
    expect(joinLine([FIRST, SECOND])).toBe(`${FIRST} · ${SECOND}`)
  })

  // A missing piece leaves no doubled separator and no dangling one.
  it('skips the pieces that are absent or empty', () => {
    expect(joinLine([null, FIRST, '', undefined, SECOND])).toBe(`${FIRST} · ${SECOND}`)
  })
})
