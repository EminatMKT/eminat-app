import { describe, it, expect } from 'vitest'
import overflowOf from './index'

const MAX = 120
const PASTED = 200
const SELECTED = 30
const HELD = 100

describe('overflowOf', () => {
  it('counts what a paste into an empty box loses', () => {
    expect(overflowOf({ length: 0, selected: 0, inserted: PASTED, max: MAX })).toBe(PASTED - MAX)
  })

  // The selected text is replaced, so it frees room before the paste lands.
  it('gives back the room a replaced selection frees', () => {
    const lost = overflowOf({ length: HELD, selected: SELECTED, inserted: HELD, max: MAX })
    expect(lost).toBe(HELD - SELECTED + HELD - MAX)
  })

  it('loses nothing when the paste fits', () => {
    expect(overflowOf({ length: SELECTED, selected: 0, inserted: SELECTED, max: MAX })).toBe(0)
  })
})
