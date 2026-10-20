import { describe, expect, it } from 'vitest'
import pendienteFixture from '@/shared/dedup/DuplicatesTab/pendienteFixture'
import openedPair from '.'

// The bug this guards against: ids unchecked on one pair would ride along to the next pair's
// merge, which the RPC rejects as foreign — the second pair could never be merged.
describe('openedPair', () => {
  it('opens a pair with no choices and nothing excluded', () => {
    const state = openedPair(pendienteFixture(), { id: 'a' }, { id: 'b' })
    expect(state.elecciones).toEqual({})
    expect(state.excludedIds).toEqual([])
    expect(state.error).toBe(false)
    expect(state.parCargado?.a).toEqual({ id: 'a' })
  })
})
