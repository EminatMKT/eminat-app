import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { rpc: mocks.rpc } }))

import descartar from '.'

describe('descartar', () => {
  beforeEach(() => mocks.rpc.mockReset())

  it('sends the pair, the motive and the note to the database', async () => {
    const args = {
      entidad: 'pacientes',
      itemIdA: 'a',
      itemIdB: 'b',
      motivo: 'son_la_misma_separadas',
      nota: 'Same family, different phone',
    }
    await descartar(args)

    const esperado = {
      p_entidad: 'pacientes',
      p_item_id_a: 'a',
      p_item_id_b: 'b',
      p_motivo: 'son_la_misma_separadas',
      p_nota: 'Same family, different phone',
    }
    expect(mocks.rpc).toHaveBeenCalledWith('decidir_descarte_duplicado', esperado)
  })
})
