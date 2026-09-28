import { describe, it, expect } from 'vitest'
import ownLimit from './index'

const MAX = 120
const TEXT = 'Rent'

describe('ownLimit', () => {
  it('reads how full a native box is from its own props', () => {
    expect(ownLimit({ value: TEXT, maxLength: MAX })).toEqual({ length: TEXT.length, max: MAX })
  })

  it('counts an uncontrolled box as empty', () => {
    expect(ownLimit({ maxLength: MAX })).toEqual({ length: 0, max: MAX })
  })

  it('has no limit for a box without maxLength, or for no native box at all', () => {
    expect(ownLimit({ value: TEXT })).toBeUndefined()
    expect(ownLimit()).toBeUndefined()
  })
})
