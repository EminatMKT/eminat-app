import { describe, expect, it } from 'vitest'
import displayName from './display'

const id = '22222222-2222-4222-8222-222222222222'

describe('displayName', () => {
  it('prefers nombre_display', () => {
    const user = {
      id,
      nombre_display: 'Anita',
      nombre: 'Ana',
      apellido: 'Pérez',
    }
    expect(displayName(user)).toBe('Anita')
  })

  it('falls back to the full name, then to the id', () => {
    const named = { id, nombre: 'Ana', apellido: 'Pérez' }
    const unnamed = { id }
    expect(displayName(named)).toBe('Ana Pérez')
    expect(displayName(unnamed)).toBe(id)
  })
})
