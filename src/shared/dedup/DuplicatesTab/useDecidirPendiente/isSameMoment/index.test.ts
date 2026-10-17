import { describe, expect, it } from 'vitest'
import isSameMoment from '.'

describe('isSameMoment', () => {
  it('drops a result from a different pair', () => {
    const requested = { pair: 'a|b', generation: 1 }
    const current = { pair: 'c|d', generation: 1 }
    expect(isSameMoment(requested, current)).toBe(false)
  })

  // The bug this guards against: closing a pair and reopening the SAME pair before a stale
  // request resolves used to look identical to a plain pairKey comparison, so the late result
  // was wrongly accepted as belonging to the reopened attempt.
  it('drops a result from the same pair but an earlier generation', () => {
    const requested = { pair: 'a|b', generation: 1 }
    const current = { pair: 'a|b', generation: 2 }
    expect(isSameMoment(requested, current)).toBe(false)
  })

  it('applies a result from the same pair and the same generation', () => {
    const requested = { pair: 'a|b', generation: 1 }
    const current = { pair: 'a|b', generation: 1 }
    expect(isSameMoment(requested, current)).toBe(true)
  })
})
