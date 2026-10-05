import { beforeEach, describe, expect, it, vi } from 'vitest'

const setResponsables = vi.fn()
const insert = vi.fn()
vi.mock('@/shared/data', () => ({
  actividadesRepo: { setResponsables: (...a: unknown[]) => setResponsables(...a) },
  notificacionesRepo: { insert: (...a: unknown[]) => insert(...a) },
}))

import saveResponsables from '.'

const A = { usuario_id: 'a', es_lider: false }
const B = { usuario_id: 'b', es_lider: true }
const C = { usuario_id: 'c', es_lider: false }
const notice = { titulo: 'Assigned', mensaje: '"T" — EMC' }
const STAMP = '2026-10-05T03:31:00.000Z'
const OK = { error: null, data: STAMP }
const LEADER_ERROR = { error: { message: 'leader not in set' } }
const RLS_ERROR = { error: { message: 'rls' } }
const base = {
  actividadId: 't1',
  previous: [A],
  next: [A],
  actorId: 'a',
  notice,
}
const notified = () => insert.mock.calls[0][0].map((r: { usuario_id: string }) => r.usuario_id)

describe('saveResponsables', () => {
  beforeEach(() => {
    setResponsables.mockReset().mockResolvedValue(OK)
    insert.mockReset().mockResolvedValue(OK)
  })

  it('saves the set and notifies every new responsible except the actor, in one insert', async () => {
    const created = { ...base, previous: [], next: [A, B, C] }
    const result = await saveResponsables(created)
    expect(result).toEqual({ error: null, updatedAt: STAMP })
    expect(setResponsables).toHaveBeenCalledWith('t1', [A, B, C])
    expect(insert).toHaveBeenCalledTimes(1)
    expect(notified()).toEqual(['b', 'c'])
  })

  it('on edit notifies only the newly added, never the removed', async () => {
    const edited = {
      ...base,
      previous: [A, B],
      next: [B, C],
      actorId: 'b',
    }
    await saveResponsables(edited)
    expect(notified()).toEqual(['c'])
  })

  it('skips the insert when nobody is new', async () => {
    const unchanged = { ...base, actorId: 'x' }
    await saveResponsables(unchanged)
    expect(insert).not.toHaveBeenCalled()
  })

  it('returns the RPC error and does not notify', async () => {
    setResponsables.mockResolvedValue(LEADER_ERROR)
    const rejected = { ...base, previous: [], next: [B] }
    const result = await saveResponsables(rejected)
    expect(result).toEqual({ error: 'leader not in set', updatedAt: null })
    expect(insert).not.toHaveBeenCalled()
  })

  it('returns the notification error instead of swallowing it, but keeps the fresh timestamp', async () => {
    insert.mockResolvedValue(RLS_ERROR)
    const unnotified = { ...base, previous: [], next: [B] }
    const result = await saveResponsables(unnotified)
    expect(result).toEqual({ error: 'rls', updatedAt: STAMP })
  })
})
