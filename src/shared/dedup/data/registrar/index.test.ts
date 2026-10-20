import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { rpc: mocks.rpc } }))

import registrar from '.'

describe('registrar', () => {
  beforeEach(() => mocks.rpc.mockReset())

  it('sends both item ids, the match level and the origin', async () => {
    const args = {
      entidad: 'pacientes',
      itemIdA: 'a',
      itemIdB: 'b',
      nivel: 'exacta' as const,
      origen: 'alta_manual',
    }
    await registrar(args)

    const esperado = {
      p_entidad: 'pacientes',
      p_item_id_a: 'a',
      p_item_id_b: 'b',
      p_nivel: 'exacta',
      p_origen: 'alta_manual',
    }
    expect(mocks.rpc).toHaveBeenCalledWith('registrar_candidato_duplicado', esperado)
  })
})
