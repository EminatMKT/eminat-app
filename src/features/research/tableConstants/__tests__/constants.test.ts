import { describe, it, expect } from 'vitest'
import { FROZEN_COLS, NCT_COLUMN, NCT_RE, MAIL_ESTADO_COLOR } from '../constants'

describe('constants', () => {
  it('freezes exactly the first two leads-table columns, back to back', () => {
    const [first, second] = FROZEN_COLS
    expect(second.left).toBe(first.width)
  })

  it('NCT_RE matches a well-formed NCT number', () => {
    const validNct = 'NCT01234567'
    expect(NCT_RE.test(validNct)).toBe(true)
  })

  it('NCT_COLUMN names the db column, not the literal', () => {
    const dbColumn = 'nct_number'
    expect(NCT_COLUMN).toBe(dbColumn)
  })

  it('every mail-estado color is a hex string', () => {
    const hexPrefix = '#'
    expect(Object.values(MAIL_ESTADO_COLOR).every(c => c.startsWith(hexPrefix))).toBe(true)
  })
})
