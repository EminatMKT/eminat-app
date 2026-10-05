import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireModule, ssrClient, dispatch } = vi.hoisted(() => ({
  requireModule: vi.fn(), ssrClient: vi.fn(), dispatch: vi.fn(),
}))
vi.mock('@/shared/db/requireAccess/requireModule', () => ({ default: requireModule }))
vi.mock('@/shared/db/requireAccess/ssrClient', () => ({ default: ssrClient }))
vi.mock('@/features/tasks/server/notifications', () => ({ dispatchTaskAssignmentEmails: dispatch }))
import { POST } from './route'

const uid = '11111111-1111-4111-8111-111111111111'
const taskId = '22222222-2222-4222-8222-222222222222'
const requestId = '33333333-3333-4333-8333-333333333333'
const payload = {
  titulo: 'Tarea operativa', empresa: 'Eminat Holding', responsable_id: uid,
  fecha_inicio: '2026-10-03', estado: 'Pendiente', mes: 'Octubre', trimestre: 'Q4',
  descripcion: null, horas: null, dias_produccion: null, fecha_entrega: null,
  solicitante_id: null, drive_url: null,
}
const request = (body: unknown) => new Request('http://localhost/api/tasks/save', { method: 'POST', body: JSON.stringify(body) }) as never

function dbWith({ prior = null, saved = { id: taskId }, conflict = null }: { prior?: unknown; saved?: unknown; conflict?: unknown } = {}) {
  const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: saved, error: null }) }) }))
  const update = vi.fn(() => ({ eq: () => ({ eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: saved, error: null }) }) }) }) }))
  const from = vi.fn((table: string) => table === 'usuarios'
    ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: uid, rol: 'admin', activo: true } }) }) }) }
    : { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: prior || conflict }) }) }), insert, update })
  ssrClient.mockReturnValue({ from })
  return { insert, update }
}

beforeEach(() => {
  vi.clearAllMocks()
  requireModule.mockResolvedValue({ ok: true, userId: uid })
  dispatch.mockResolvedValue({ warning: null })
})

describe('task save API', () => {
  it('rejects callers without Tasks permission before touching data', async () => {
    requireModule.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' })
    expect((await POST(request({ requestId, payload }))).status).toBe(403)
    expect(ssrClient).not.toHaveBeenCalled()
  })
  it('rejects creation without an assignee', async () => {
    expect((await POST(request({ requestId, payload: { ...payload, responsable_id: null } }))).status).toBe(400)
    expect(ssrClient).not.toHaveBeenCalled()
  })
  it('creates once and invokes server-side delivery after persistence', async () => {
    const db = dbWith()
    const res = await POST(request({ requestId, payload }))
    expect(res.status).toBe(200)
    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ assignment_request_id: requestId, responsable_id: uid }))
    expect(dispatch).toHaveBeenCalledWith(taskId)
  })
  it('reuses a saved task on request replay', async () => {
    const db = dbWith({ prior: { id: taskId } })
    expect((await POST(request({ requestId, payload }))).status).toBe(200)
    expect(db.insert).not.toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledWith(taskId)
  })
  it('updates an existing task with optimistic version', async () => {
    const db = dbWith()
    expect((await POST(request({ requestId, id: taskId, expectedUpdatedAt: '2026-10-03T00:00:00Z', payload }))).status).toBe(200)
    expect(db.update).toHaveBeenCalledWith(payload)
    expect(dispatch).toHaveBeenCalledWith(taskId)
  })
  it('does not send when an update conflicts', async () => {
    dbWith({ saved: null, conflict: { id: taskId } })
    expect((await POST(request({ requestId, id: taskId, expectedUpdatedAt: '2026-10-03T00:00:00Z', payload }))).status).toBe(409)
    expect(dispatch).not.toHaveBeenCalled()
  })
})
