import { beforeEach, describe, expect, it, vi } from 'vitest'

const setResponsables = vi.fn()
vi.mock('@/shared/data', () => ({ actividadesRepo: { setResponsables: (...args: unknown[]) => setResponsables(...args) } }))
import saveResponsables from '.'

const principal = { usuario_id: 'a', es_lider: true }
const collaborator = { usuario_id: 'b', es_lider: false }
const input = { actividadId: 'task', previous: [principal], next: [principal, collaborator], actorId: 'a', notice: { titulo: 'T', mensaje: 'M' } }

describe('saveResponsables', () => {
  beforeEach(() => {
    setResponsables.mockReset().mockResolvedValue({ error: null, data: 'new-version' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  })

  it('persists principal plus collaborators once and flushes the database outbox', async () => {
    expect(await saveResponsables(input)).toEqual({ error: null, updatedAt: 'new-version' })
    expect(setResponsables).toHaveBeenCalledWith('task', [principal, collaborator])
    expect(fetch).toHaveBeenCalledWith('/api/tasks/notifications/process', expect.objectContaining({ method: 'POST' }))
  })

  it('does not send a browser notification or roll back when mail delivery fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('mail unavailable')))
    expect(await saveResponsables(input)).toEqual({ error: null, updatedAt: 'new-version' })
  })

  it('does not flush outbox when the assignment transaction fails', async () => {
    setResponsables.mockResolvedValue({ error: { message: 'RLS' } })
    expect(await saveResponsables(input)).toEqual({ error: 'RLS', updatedAt: null })
    expect(fetch).not.toHaveBeenCalled()
  })
})
