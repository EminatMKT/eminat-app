import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { rpc: mocks.rpc } }))

import escanear from '.'

describe('escanear', () => {
  beforeEach(() => mocks.rpc.mockReset())

  it('scans one entity for new duplicate candidates', () => {
    escanear('pacientes')

    const esperado = { p_entidad: 'pacientes' }
    expect(mocks.rpc).toHaveBeenCalledWith('escanear_duplicados', esperado)
  })
})
