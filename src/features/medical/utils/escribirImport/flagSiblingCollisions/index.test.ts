import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest'
import { ORIGEN_IMPORT } from '@/shared/dedup/types'
import type { Paciente } from '@/features/medical/types'
import flagSiblingCollisions from '.'

// Untyped on purpose: the real `registrar` resolves a Postgrest response, and these tests only
// need its `{ error }` half — the shape `supabase.rpc()` resolves with even when the RPC fails.
const mocks = vi.hoisted(() => ({ registrar: vi.fn() }))
vi.mock('@/shared/dedup/data/registrar', () => ({ default: mocks.registrar }))

function fresca(id: string, nombre: string, apellido: string): { id: string; paciente: Partial<Paciente> } {
  const paciente: Partial<Paciente> = { nombre, apellido, fecha_nacimiento: '1990-01-01' }
  return { id, paciente }
}

describe('flagSiblingCollisions', () => {
  beforeEach(() => {
    mocks.registrar.mockReset()
    mocks.registrar.mockResolvedValue({ error: null })
  })

  it('registers a match between two new rows of the same batch', async () => {
    const a = fresca('a1', 'Ana', 'Ruiz')
    const b = fresca('b1', 'Ana', 'Ruiz')

    const { failed } = await flagSiblingCollisions([a, b])

    expect(failed).toBe(0)
    expect(mocks.registrar).toHaveBeenCalledWith({
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

    expect(mocks.registrar).not.toHaveBeenCalled()
  })

  // The bug this guards against: the RPC resolves `{ error }` instead of throwing, so a
  // try/catch alone counted nothing and the warning never fired.
  it('counts and warns about a registration the RPC resolved with an error', async () => {
    const a = fresca('a1', 'Ana', 'Ruiz')
    const b = fresca('b1', 'Ana', 'Ruiz')
    mocks.registrar.mockResolvedValue({ error: { code: '42501', message: 'denied' } })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { failed } = await flagSiblingCollisions([a, b])

    expect(failed).toBe(1)
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('still swallows a registration that throws, such as a network failure', async () => {
    const a = fresca('a1', 'Ana', 'Ruiz')
    const b = fresca('b1', 'Ana', 'Ruiz')
    mocks.registrar.mockRejectedValue(new Error('offline'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { failed } = await flagSiblingCollisions([a, b])

    expect(failed).toBe(1)
    warn.mockRestore()
  })
})
