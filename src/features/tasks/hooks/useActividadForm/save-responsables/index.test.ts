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

describe('saveResponsables', () => {
  beforeEach(() => {
    setResponsables.mockReset().mockResolvedValue({ error: null })
    insert.mockReset().mockResolvedValue({ error: null })
  })

  it('saves the set and notifies every new responsible except the actor, in one insert', async () => {
    const error = await saveResponsables({ actividadId: 't1', previous: [], next: [A, B, C], actorId: 'a', notice })
    expect(error).toBeNull()
    expect(setResponsables).toHaveBeenCalledWith('t1', [A, B, C])
    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert.mock.calls[0][0].map((r: { usuario_id: string }) => r.usuario_id)).toEqual(['b', 'c'])
  })

  it('on edit notifies only the newly added, never the removed', async () => {
    await saveResponsables({ actividadId: 't1', previous: [A, B], next: [B, C], actorId: 'b', notice })
    expect(insert.mock.calls[0][0].map((r: { usuario_id: string }) => r.usuario_id)).toEqual(['c'])
  })

  it('skips the insert when nobody is new', async () => {
    await saveResponsables({ actividadId: 't1', previous: [A], next: [A], actorId: 'x', notice })
    expect(insert).not.toHaveBeenCalled()
  })

  it('returns the RPC error and does not notify', async () => {
    setResponsables.mockResolvedValue({ error: { message: 'leader not in set' } })
    const error = await saveResponsables({ actividadId: 't1', previous: [], next: [B], actorId: 'a', notice })
    expect(error).toBe('leader not in set')
    expect(insert).not.toHaveBeenCalled()
  })

  it('returns the notification error instead of swallowing it', async () => {
    insert.mockResolvedValue({ error: { message: 'rls' } })
    const error = await saveResponsables({ actividadId: 't1', previous: [], next: [B], actorId: 'a', notice })
    expect(error).toBe('rls')
  })
})
