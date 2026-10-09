import { describe, it, expect } from 'vitest'
import pacienteFixture from './index'

describe('pacienteFixture', () => {
  it('builds a valid patient with its own id by default', () => {
    expect(pacienteFixture().id).toBe('p1')
  })

  it('applies overrides on top of the base shape', () => {
    expect(pacienteFixture({ id: 'p2', nombre: 'Luz' }).nombre).toBe('Luz')
  })
})
