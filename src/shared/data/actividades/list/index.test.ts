import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { from: mocks.from } }))

import list from '.'

const chain = (result: unknown) => {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    overrideTypes: vi.fn(async () => result),
  }
  return query
}

describe('list', () => {
  beforeEach(() => mocks.from.mockReset())

  it('loads responsibles with the explicit FK embed and canonical shape, newest first', async () => {
    const activityResponsables = [
      { usuario_id: 'usr-1', es_lider: true },
      { usuario_id: 'usr-2', es_lider: false },
    ]
    const row = { id: 'act-1', titulo: 'Pauta', actividad_responsables: activityResponsables }
    const query = chain({ data: [row], error: null })
    mocks.from.mockReturnValue(query)

    const result = await list()
    const expectedEmbed = 'actividad_responsables!actividad_responsables_actividad_id_fkey(usuario_id, es_lider)'

    expect(query.select).toHaveBeenCalledWith(expect.stringContaining(expectedEmbed))
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result.data).toEqual([{ id: 'act-1', titulo: 'Pauta', responsables: activityResponsables }])
  })

  it('keeps a failed read as null data with its error', async () => {
    const query = chain({ data: null, error: { message: 'rls' } })
    mocks.from.mockReturnValue(query)

    const result = await list()

    expect(result.data).toBeNull()
    expect(result.error).toEqual({ message: 'rls' })
  })
})
