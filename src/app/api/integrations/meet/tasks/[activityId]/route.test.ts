import { beforeEach, describe, expect, it, vi } from 'vitest'

const { auth, update, get } = vi.hoisted(() => ({ auth: vi.fn(), update: vi.fn(), get: vi.fn() }))
vi.mock('../../_shared/auth', () => ({ requireMeetTaskActor: auth }))
vi.mock('../../_shared/task-service', () => ({ updateTask: update, getCanonicalTask: get }))

import { GET, PATCH } from './route'

describe('PATCH Meet Tasks', () => {
  beforeEach(() => { vi.clearAllMocks(); auth.mockResolvedValue({ ok: true, actor: { client: {}, authUserId: 'auth-1', profileId: 'profile-1' } }) })
  it('propaga 409 y la versión canónica cuando updated_at cambió', async () => {
    update.mockResolvedValue({ ok: false, status: 409, code: 'TASK_CONFLICT', message: 'Conflicto', current: { id: '11111111-1111-4111-8111-111111111111', updated_at: '2026-09-18T13:00:00Z' } })
    const request = new Request('https://app.stratixsolutions.us/api/integrations/meet/tasks/11111111-1111-4111-8111-111111111111', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ expected_updated_at: '2026-09-18T12:00:00Z', titulo: 'Nueva Task' }),
    })
    const response = await PATCH(request, { params: { activityId: '11111111-1111-4111-8111-111111111111' } })
    expect(response.status).toBe(409)
    expect((await response.json()).error.code).toBe('TASK_CONFLICT')
  })
  it('rechaza un intento de cambiar estado antes de llamar al servicio', async () => {
    const request = new Request('https://app.stratixsolutions.us/api/integrations/meet/tasks/11111111-1111-4111-8111-111111111111', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ expected_updated_at: '2026-09-18T12:00:00Z', estado: 'Completado' }),
    })
    expect((await PATCH(request, { params: { activityId: '11111111-1111-4111-8111-111111111111' } })).status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })
  it('pasa la identidad del JWT al GET para validar el vínculo con Meet', async () => {
    get.mockResolvedValue({ ok: true, data: { id: '11111111-1111-4111-8111-111111111111' } })
    const request = new Request('https://app.stratixsolutions.us/api/integrations/meet/tasks/11111111-1111-4111-8111-111111111111')
    expect((await GET(request, { params: { activityId: '11111111-1111-4111-8111-111111111111' } })).status).toBe(200)
    expect(get).toHaveBeenCalledWith({}, '11111111-1111-4111-8111-111111111111', 'auth-1')
  })
})
