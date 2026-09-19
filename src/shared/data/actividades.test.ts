import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { from: mocks.from } }))

import { update, updateEstado } from './actividades'

type DbResult = { data: Record<string, unknown> | null; error: { message: string } | null }

function chain(result: DbResult) {
  const api = {
    update: vi.fn(() => api), select: vi.fn(() => api), eq: vi.fn(() => api),
    maybeSingle: vi.fn(async () => result),
  }
  return api
}

describe('actividadesRepo optimistic updates', () => {
  beforeEach(() => mocks.from.mockReset())

  it('condiciona el update por id y updated_at y devuelve la fila nueva', async () => {
    const saved = { id: 'act-1', estado: 'En proceso', updated_at: '2026-09-18T14:00:00Z' }
    const updateQuery = chain({ data: saved, error: null })
    mocks.from.mockReturnValue(updateQuery)

    const result = await updateEstado('act-1', 'En proceso', '2026-09-18T13:00:00Z')

    expect(updateQuery.update).toHaveBeenCalledWith({ estado: 'En proceso' })
    expect(updateQuery.eq).toHaveBeenNthCalledWith(1, 'id', 'act-1')
    expect(updateQuery.eq).toHaveBeenNthCalledWith(2, 'updated_at', '2026-09-18T13:00:00Z')
    expect(result).toEqual({ data: saved, error: null, conflict: false })
  })

  it('recupera la versión actual cuando el timestamp ya cambió', async () => {
    const updateQuery = chain({ data: null, error: null })
    const current = { id: 'act-1', titulo: 'Cambio de Meet', updated_at: '2026-09-18T14:00:00Z' }
    const currentQuery = chain({ data: current, error: null })
    mocks.from.mockReturnValueOnce(updateQuery).mockReturnValueOnce(currentQuery)

    const result = await update('act-1', { titulo: 'Cambio local' }, '2026-09-18T13:00:00Z')

    expect(currentQuery.select).toHaveBeenCalledWith('*')
    expect(currentQuery.eq).toHaveBeenCalledWith('id', 'act-1')
    expect(result).toEqual({ data: null, error: null, conflict: true, current })
  })

  it('no escribe si la fila cargada no tiene updated_at', async () => {
    const result = await update('act-1', { titulo: 'Cambio local' }, undefined)
    expect(mocks.from).not.toHaveBeenCalled()
    expect(result).toEqual({ data: null, error: null, conflict: true, current: null })
  })
})
