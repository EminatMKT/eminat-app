import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { rpc: mocks.rpc } }))

import fusionar from '.'

describe('fusionar', () => {
  beforeEach(() => mocks.rpc.mockReset())

  it('sends the winner, the loser and the chosen field values', async () => {
    const args = {
      entidad: 'pacientes',
      ganadorId: 'a',
      perdedorId: 'b',
      valoresFinales: { telefono: '555-0100' },
    }
    await fusionar(args)

    const esperado = {
      p_entidad: 'pacientes',
      p_ganador_id: 'a',
      p_perdedor_id: 'b',
      p_valores_finales: { telefono: '555-0100' },
    }
    expect(mocks.rpc).toHaveBeenCalledWith('fusionar_duplicado', esperado)
  })
})
