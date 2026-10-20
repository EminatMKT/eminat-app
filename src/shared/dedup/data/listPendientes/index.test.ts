import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { from: mocks.from } }))

import listPendientes from '.'

function stubChain(data: unknown) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.overrideTypes = vi.fn(() => chain)
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data, error: null }))
  return chain
}

describe('listPendientes', () => {
  beforeEach(() => mocks.from.mockReset())

  it('reads duplicados_pendientes filtered by entidad', async () => {
    const fila = {
      item_id_a: 'a',
      item_id_b: 'b',
      nivel: 'exacta',
      detectado_at: '2026-01-01',
    }
    const chain = stubChain([fila])
    mocks.from.mockReturnValue(chain)

    const resultado = await listPendientes('pacientes')

    expect(mocks.from).toHaveBeenCalledWith('duplicados_pendientes')
    expect(chain.eq).toHaveBeenCalledWith('entidad', 'pacientes')
    expect(resultado.data).toEqual([fila])
  })
})
