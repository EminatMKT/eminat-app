import { describe, expect, it } from 'vitest'
import pendienteFixture from '.'

describe('pendienteFixture', () => {
  it('defaults to an exact-match pair', () => {
    expect(pendienteFixture().nivel).toBe('exacta')
  })

  it('applies overrides on top of the default pair', () => {
    expect(pendienteFixture({ item_id_a: 'c' }).item_id_a).toBe('c')
  })
})
