import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest'
import pacienteFixture from '../fixture'
import { ORIGEN_ALTA_MANUAL } from '@/shared/dedup/types'
import registrar from '@/shared/dedup/data/registrar'
import dedupSignal from '.'

vi.mock('@/shared/dedup/data/registrar', () => ({ default: vi.fn() }))

describe('dedupSignal', () => {
  beforeEach(() => {
    vi.mocked(registrar).mockReset()
  })

  it('registers a candidate pair against an existing patient that matches', async () => {
    const existing = pacienteFixture({ id: 'existing-1', fecha_nacimiento: '1990-01-01' })
    const fresh = pacienteFixture({ id: 'fresh-1', fecha_nacimiento: '1990-01-01' })

    await dedupSignal(fresh, [existing])

    expect(registrar).toHaveBeenCalledWith({
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

    expect(registrar).not.toHaveBeenCalled()
  })

  it('swallows a failed registration instead of throwing, but warns about it', async () => {
    const existing = pacienteFixture({ id: 'existing-2', fecha_nacimiento: '1990-01-01' })
    const fresh = pacienteFixture({ id: 'fresh-3', fecha_nacimiento: '1990-01-01' })
    vi.mocked(registrar).mockRejectedValue(new Error('boom'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(dedupSignal(fresh, [existing])).resolves.not.toThrow()

    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})
