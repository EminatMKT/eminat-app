import { beforeEach, describe, expect, it, vi } from 'vitest'

const { auth, create } = vi.hoisted(() => ({ auth: vi.fn(), create: vi.fn() }))
vi.mock('../_shared/auth', () => ({ requireMeetTaskActor: auth }))
vi.mock('../_shared/task-service', () => ({ createTaskForTopic: create }))

import { POST } from './route'

const body = {
  topic_id: '11111111-1111-4111-8111-111111111111', titulo: 'Task', descripcion: null,
  responsable_id: '22222222-2222-4222-8222-222222222222',
  fecha_inicio: '2026-09-18', fecha_entrega: null, empresa: 'STRATIX',
}
const request = (payload: unknown) => new Request('https://app.stratixsolutions.us/api/integrations/meet/tasks', {
  method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://meet.stratixsolutions.us' }, body: JSON.stringify(payload),
})

describe('POST Meet Tasks', () => {
  beforeEach(() => { vi.clearAllMocks(); auth.mockResolvedValue({ ok: true, actor: { client: {}, authUserId: 'auth-1', profileId: 'profile-1' } }) })
  it('rechaza al actor no autorizado antes de mutar', async () => {
    auth.mockResolvedValue({ ok: false, status: 403, error: 'Sin permiso' })
    const response = await POST(request(body))
    expect(response.status).toBe(403)
    expect(create).not.toHaveBeenCalled()
  })
  it('devuelve 201 para alta y no entrega campos de autoridad al servicio', async () => {
    create.mockResolvedValue({ ok: true, data: { task: { id: 'a-1' }, idempotent: false } })
    const response = await POST(request(body))
    expect(response.status).toBe(201)
    expect(create.mock.calls[0][2]).toEqual(body)
  })
  it('devuelve 200 al repetir el mismo topic', async () => {
    create.mockResolvedValue({ ok: true, data: { task: { id: 'a-1' }, idempotent: true } })
    expect((await POST(request(body))).status).toBe(200)
  })
})
