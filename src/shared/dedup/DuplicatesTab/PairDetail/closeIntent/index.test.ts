import { describe, expect, it } from 'vitest'
import { CLOSE_CONFIRM, CLOSE_IGNORED, CLOSE_NOW } from '../constants'
import closeIntent from '.'

// The bug this guards against: closing mid-merge and opening another pair let pair 1's late
// answer close or mark pair 2; a stray backdrop click silently threw every pick away.
describe('closeIntent', () => {
  it('ignores a close while a decision is in flight', () => {
    expect(closeIntent(true, false)).toBe(CLOSE_IGNORED)
    expect(closeIntent(true, true)).toBe(CLOSE_IGNORED)
  })

  it('asks first when picks or unchecked values would be lost', () => {
    expect(closeIntent(false, true)).toBe(CLOSE_CONFIRM)
  })

  it('closes at once when nothing would be lost', () => {
    expect(closeIntent(false, false)).toBe(CLOSE_NOW)
  })
})
