import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { from: mocks.from } }))
import { update, updateEstado } from '../actividades'
type DbResult = {
  data: Record<string, unknown> | null
  error: Error | null
}
function chain(result: DbResult) {
  const api = {
    update: vi.fn(() => api),
    select: vi.fn(() => api),
    eq: vi.fn(() => api),
    maybeSingle: vi.fn(async () => result),
  }
  return api
}
describe('actividadesRepo optimistic updates', () => {
  beforeEach(() => mocks.from.mockReset())
  it('conditions updateEstado by id and updated_at and returns the saved row', async () => {
    const saved = { id: 'act-1', estado: 'En proceso', updated_at: '2026-09-18T14:00:00Z' }
    const updateQuery = chain({ data: saved, error: null })
    mocks.from.mockReturnValue(updateQuery)
    const result = await updateEstado('act-1', 'En proceso', '2026-09-18T13:00:00Z')
    const expected = { data: { ...saved, responsables: [] }, error: null, conflict: false }
    expect(updateQuery.update).toHaveBeenCalledWith({ estado: 'En proceso' })
    expect(updateQuery.eq).toHaveBeenNthCalledWith(1, 'id', 'act-1')
    expect(updateQuery.eq).toHaveBeenNthCalledWith(2, 'updated_at', '2026-09-18T13:00:00Z')
    expect(result).toEqual(expected)
  })
  it('fetches the current row when updated_at conflicts', async () => {
    const updateQuery = chain({ data: null, error: null })
    const current = { id: 'act-1', titulo: 'Meet change', updated_at: '2026-09-18T14:00:00Z' }
    const currentQuery = chain({ data: current, error: null })
    mocks.from.mockReturnValueOnce(updateQuery).mockReturnValueOnce(currentQuery)
    const result = await update('act-1', { titulo: 'Local change' }, '2026-09-18T13:00:00Z')
    const expected = {
      data: null,
      error: null,
      conflict: true,
      current: { ...current, responsables: [] },
    }
    expect(currentQuery.select).toHaveBeenCalledWith(expect.stringContaining('actividad_responsables!'))
    expect(currentQuery.eq).toHaveBeenCalledWith('id', 'act-1')
    expect(result).toEqual(expected)
  })
})
