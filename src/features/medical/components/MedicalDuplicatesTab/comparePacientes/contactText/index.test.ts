import { describe, expect, it } from 'vitest'
import contactText from '.'

const PHONE = { id: 'c1', valor: '555-0001' }

describe('contactText', () => {
  it('reads a contact row by the value the reviewer sees', () => {
    expect(contactText(PHONE)).toBe(PHONE.valor)
  })
})
