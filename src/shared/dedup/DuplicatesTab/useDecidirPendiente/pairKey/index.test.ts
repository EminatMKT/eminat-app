import { describe, expect, it } from 'vitest'
import pendienteFixture from '@/shared/dedup/DuplicatesTab/pendienteFixture'
import pairKey from '.'

describe('pairKey', () => {
  it('names no pair when none is open', () => {
    expect(pairKey(null)).toBeNull()
  })

  it('tells two different pairs apart', () => {
    const other = pendienteFixture({ item_id_a: 'c', item_id_b: 'd' })
    expect(pairKey(pendienteFixture())).not.toBe(pairKey(other))
  })
})
