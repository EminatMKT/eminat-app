import { describe, expect, it } from 'vitest'
import decidirArgsFixture from '.'

describe('decidirArgsFixture', () => {
  it('loads both sides of the open pair under their own ids', () => {
    const { abierto, itemA, itemB } = decidirArgsFixture({})
    expect(itemA?.id).toBe(abierto?.item_id_a)
    expect(itemB?.id).toBe(abierto?.item_id_b)
  })

  it('applies overrides on top of the default arguments', () => {
    expect(decidirArgsFixture({ itemB: null }).itemB).toBeNull()
  })
})
