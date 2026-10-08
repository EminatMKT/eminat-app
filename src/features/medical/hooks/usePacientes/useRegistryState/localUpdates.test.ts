import { describe, it, expect, vi } from 'vitest'
import pacienteFixture from '../fixture'
import localUpdates from './localUpdates'

describe('localUpdates', () => {
  it('appends the new patient to the list', () => {
    const setState = vi.fn()
    const { addLocal } = localUpdates(setState)
    addLocal(pacienteFixture({ id: 'p2' }))
    const updater = setState.mock.calls[0][0]
    const result = updater({ pacientes: [pacienteFixture({ id: 'p1' })] })
    expect(result.pacientes.map((p: { id: string }) => p.id)).toEqual(['p1', 'p2'])
  })

  it('replaces the matching patient in place', () => {
    const setState = vi.fn()
    const { updateLocal } = localUpdates(setState)
    updateLocal('p1', pacienteFixture({ id: 'p1', nombre: 'Nueva' }))
    const updater = setState.mock.calls[0][0]
    const result = updater({ pacientes: [pacienteFixture({ id: 'p1' })] })
    expect(result.pacientes[0].nombre).toBe('Nueva')
  })
})
