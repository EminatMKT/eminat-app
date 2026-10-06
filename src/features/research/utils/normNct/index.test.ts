import { describe, it, expect } from 'vitest'
import normNct from './index'

describe('normNct', () => {
  it('trims and uppercases', () => {
    const rawNct = ' nct01234567 '
    const normalized = 'NCT01234567'
    expect(normNct(rawNct)).toBe(normalized)
  })

  it('treats a missing value as an empty string', () => {
    const empty = ''
    expect(normNct(undefined)).toBe(empty)
  })
})
