import { describe, expect, it } from 'vitest'
import toggleExcluded from '.'

describe('toggleExcluded', () => {
  it('excludes every id of a row that was kept', () => {
    expect(toggleExcluded([], ['a', 'b'])).toEqual(['a', 'b'])
  })

  it('keeps again a row whose ids were all excluded', () => {
    expect(toggleExcluded(['a', 'b', 'c'], ['a', 'b'])).toEqual(['c'])
  })

  // A value held twice by the loser (two `fuente`s) is one row: half-excluded is not a state.
  it('finishes excluding a row that was only partly excluded', () => {
    expect(toggleExcluded(['a'], ['a', 'b'])).toEqual(['a', 'b'])
  })
})
