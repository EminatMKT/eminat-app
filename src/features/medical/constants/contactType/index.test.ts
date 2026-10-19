import { describe, expect, it } from 'vitest'
import CONTACT_TYPE from '.'

describe('CONTACT_TYPE', () => {
  it('holds the two values the `tipo_contacto` domain allows', () => {
    const values = Object.values(CONTACT_TYPE)
    expect(values.sort()).toEqual(['email', 'telefono'])
  })
})
