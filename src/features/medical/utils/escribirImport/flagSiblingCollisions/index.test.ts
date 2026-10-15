import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest'
import registrar from '@/shared/dedup/data/registrar'
import { ORIGEN_IMPORT } from '@/shared/dedup/types'
import type { Paciente } from '@/features/medical/types'
import flagSiblingCollisions from '.'

vi.mock('@/shared/dedup/data/registrar', () => ({ default: vi.fn() }))

function fresca(id: string, nombre: string, apellido: string): { id: string; paciente: Partial<Paciente> } {
  const paciente: Partial<Paciente> = { nombre, apellido, fecha_nacimiento: '1990-01-01' }
  return { id, paciente }
}

describe('flagSiblingCollisions', () => {
  beforeEach(() => {
    vi.mocked(registrar).mockReset()
  })

  it('registers a match between two new rows of the same batch', async () => {
    const a = fresca('a1', 'Ana', 'Ruiz')
    const b = fresca('b1', 'Ana', 'Ruiz')

    await flagSiblingCollisions([a, b])

    expect(registrar).toHaveBeenCalledWith({
      entidad: 'pacientes',
      itemIdA: 'a1',
      itemIdB: 'b1',
      nivel: 'exacta',
      origen: ORIGEN_IMPORT,
    })
  })

  it('does not register anything when the rows do not match', async () => {
    const a = fresca('a1', 'Ana', 'Ruiz')
    const b = fresca('b1', 'Beto', 'Diaz')

    await flagSiblingCollisions([a, b])

    expect(registrar).not.toHaveBeenCalled()
  })

  it('swallows a failed registration instead of throwing', async () => {
    const a = fresca('a1', 'Ana', 'Ruiz')
    const b = fresca('b1', 'Ana', 'Ruiz')
    vi.mocked(registrar).mockRejectedValue(new Error('boom'))

    await expect(flagSiblingCollisions([a, b])).resolves.not.toThrow()
  })
})
