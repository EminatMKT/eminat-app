import { describe, it, expect } from 'vitest'
import INSERTION from './index'

describe('INSERTION', () => {
  // Pasting over a selection swaps it; dropping text puts it where the pointer lets go.
  it('tells a replacing insertion from one that lands beside the selection', () => {
    expect(INSERTION.replacesSelection).not.toBe(INSERTION.landsAtPointer)
  })

  it('reads the plain-text flavour of what is carried', () => {
    expect(INSERTION.plainText).toBeTruthy()
  })
})
