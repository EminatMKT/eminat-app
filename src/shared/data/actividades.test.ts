import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { from: mocks.from } }))

import { list } from './actividades'

describe('actividadesRepo list', () => {
  beforeEach(() => mocks.from.mockReset())

  it('loads responsibles with the explicit FK embed and canonical shape', async () => {
    const activityResponsables = [
      { usuario_id: 'usr-1', es_lider: true },
      { usuario_id: 'usr-2', es_lider: false },
    ]
    const row = { id: 'act-1', titulo: 'Pauta', actividad_responsables: activityResponsables }
    const query = {
      select: vi.fn(() => query),
      order: vi.fn(async () => ({ data: [row], error: null })),
    }
    mocks.from.mockReturnValue(query)

    const result = await list()
    const expectedEmbed = 'actividad_responsables!actividad_responsables_actividad_id_fkey(usuario_id, es_lider)'

    expect(query.select).toHaveBeenCalledWith(expect.stringContaining(expectedEmbed))
    expect(query.select).not.toHaveBeenCalledWith('*')
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result.data).toEqual([{ id: 'act-1', titulo: 'Pauta', responsables: activityResponsables }])
  })
})
