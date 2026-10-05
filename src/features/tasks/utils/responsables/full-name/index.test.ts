import { describe, expect, it } from 'vitest'
import fullName from '.'

describe('fullName', () => {
  it('joins nombre and apellido, trimmed', () => {
    expect(fullName({ id: 'u1', nombre: ' Ana ', apellido: ' Bravo ' })).toBe('Ana Bravo')
    expect(fullName({ id: 'u1', nombre: 'Ana' })).toBe('Ana')
  })

  it('falls back to name, then email, then empty', () => {
    expect(fullName({ id: 'u1', nombre: '  ', name: 'Ana B' })).toBe('Ana B')
    expect(fullName({ id: 'u1', email: 'a@b.test' })).toBe('a@b.test')
    expect(fullName({ id: 'u1' })).toBe('')
    expect(fullName(undefined)).toBe('')
  })
})
