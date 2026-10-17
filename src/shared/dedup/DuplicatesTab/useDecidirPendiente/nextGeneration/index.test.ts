import { describe, expect, it } from 'vitest'
import pendienteFixture from '@/shared/dedup/DuplicatesTab/pendienteFixture'
import nextGeneration from '.'

describe('nextGeneration', () => {
  it('keeps the generation across a render where nothing opened or closed', () => {
    const abierto = pendienteFixture()
    expect(nextGeneration(abierto, abierto, 3)).toBe(3)
  })

  it('bumps when a pair opens', () => {
    const abierto = pendienteFixture()
    expect(nextGeneration(null, abierto, 0)).toBe(1)
  })

  it('bumps when a pair closes', () => {
    const abierto = pendienteFixture()
    expect(nextGeneration(abierto, null, 1)).toBe(2)
  })

  // The bug this guards against: reopening the identical pair right after closing it looked like
  // "no change" to a plain pairKey comparison, so a result from the discarded attempt was still
  // accepted as current.
  it('bumps again when the very same pair is reopened after closing', () => {
    const abierto = pendienteFixture()
    const afterClose = nextGeneration(abierto, null, 1)
    const afterReopen = nextGeneration(null, abierto, afterClose)
    expect(afterReopen).toBe(3)
  })
})
