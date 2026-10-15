import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest'
import pacienteFixture from '../fixture'
import { ORIGEN_ALTA_MANUAL } from '@/shared/dedup/types'
import dedupSignal from '.'

// Untyped on purpose: the real `registrar` resolves a Postgrest response, and these tests only
// need its `{ error }` half — the shape `supabase.rpc()` resolves with even when the RPC fails.
const mocks = vi.hoisted(() => ({ registrar: vi.fn() }))
vi.mock('@/shared/dedup/data/registrar', () => ({ default: mocks.registrar }))

describe('dedupSignal', () => {
  beforeEach(() => {
    mocks.registrar.mockReset()
    mocks.registrar.mockResolvedValue({ error: null })
  })

  it('registers a candidate pair against an existing patient that matches', async () => {
    const existing = pacienteFixture({ id: 'existing-1', fecha_nacimiento: '1990-01-01' })
    const fresh = pacienteFixture({ id: 'fresh-1', fecha_nacimiento: '1990-01-01' })

    const { failed } = await dedupSignal(fresh, [existing])

    expect(failed).toBe(0)
    expect(mocks.registrar).toHaveBeenCalledWith({
      entidad: 'pacientes',
      itemIdA: 'fresh-1',
      itemIdB: 'existing-1',
      nivel: 'exacta',
      origen: ORIGEN_ALTA_MANUAL,
    })
  })

  it('does not register anything when no existing patient matches', async () => {
    const unrelated = pacienteFixture({ id: 'unrelated-1', fecha_nacimiento: '1980-05-05' })
    const fresh = pacienteFixture({ id: 'fresh-2', fecha_nacimiento: '1990-01-01' })

    await dedupSignal(fresh, [unrelated])

    expect(mocks.registrar).not.toHaveBeenCalled()
  })

  // The bug this guards against: the RPC resolves `{ error }` instead of throwing, so a
  // try/catch alone counted nothing and the warning never fired.
  it('counts and warns about a registration the RPC resolved with an error', async () => {
    const existing = pacienteFixture({ id: 'existing-2', fecha_nacimiento: '1990-01-01' })
    const fresh = pacienteFixture({ id: 'fresh-3', fecha_nacimiento: '1990-01-01' })
    mocks.registrar.mockResolvedValue({ error: { code: '42501', message: 'denied' } })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { failed } = await dedupSignal(fresh, [existing])

    expect(failed).toBe(1)
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('still swallows a registration that throws, such as a network failure', async () => {
    const existing = pacienteFixture({ id: 'existing-3', fecha_nacimiento: '1990-01-01' })
    const fresh = pacienteFixture({ id: 'fresh-4', fecha_nacimiento: '1990-01-01' })
    mocks.registrar.mockRejectedValue(new Error('offline'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { failed } = await dedupSignal(fresh, [existing])

    expect(failed).toBe(1)
    warn.mockRestore()
  })
})
