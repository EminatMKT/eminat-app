import { describe, expect, it } from 'vitest'
import flagsForPair from '.'

// The bug this guards against: one failed merge left "Could not merge" on every pair opened
// after it, before the reviewer had done anything there.
describe('flagsForPair', () => {
  const failedOnFirst = {
    pair: 'first',
    ocupado: false,
    errorDescarte: false,
    errorFusion: true,
  }

  it('shows a pair its own failure', () => {
    expect(flagsForPair(failedOnFirst, 'first').errorFusion).toBe(true)
  })

  it('shows another pair as idle', () => {
    const visible = flagsForPair(failedOnFirst, 'second')
    expect(visible.errorFusion).toBe(false)
    expect(visible.ocupado).toBe(false)
    expect(visible.pair).toBe('second')
  })
})
