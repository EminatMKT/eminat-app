import { describe, it, expect } from 'vitest'
import usersFromNames from './names'

describe('usersFromNames', () => {
  it('turns the id -> name map into user rows the ordering helpers can read', () => {
    expect(usersFromNames({ u1: 'Ana Bravo', u2: 'Beto Medico' })).toEqual([
      { id: 'u1', name: 'Ana Bravo' },
      { id: 'u2', name: 'Beto Medico' },
    ])
  })

  it('an empty map gives no users', () => {
    expect(usersFromNames({})).toEqual([])
  })
})
