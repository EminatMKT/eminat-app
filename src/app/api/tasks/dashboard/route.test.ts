import { beforeEach, expect, it, vi } from 'vitest'
const { requireAdmin, rpc } = vi.hoisted(() => ({ requireAdmin: vi.fn(), rpc: vi.fn() }))
vi.mock('@/shared/db/requireAdmin', () => ({ default: requireAdmin }))
vi.mock('@/shared/db/requireAccess/ssrClient', () => ({ default: () => ({ rpc }) }))
import { GET } from './route'
const request = (query = '') => ({ nextUrl: new URL(`http://localhost/api/tasks/dashboard${query}`) }) as never
beforeEach(() => { vi.clearAllMocks(); requireAdmin.mockResolvedValue({ ok: true }); rpc.mockResolvedValue({ data: { overview: { total: 0 } }, error: null }) })
it('denies non-admins before aggregate query', async () => {
  requireAdmin.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' })
  expect((await GET(request())).status).toBe(403)
  expect(rpc).not.toHaveBeenCalled()
})
it('calls the server aggregate with supported filters', async () => {
  const res = await GET(request('?from=2026-10-01&to=2026-10-03&empresa=Eminat%20Holding&estado=Pendiente'))
  expect(res.status).toBe(200)
  expect(rpc).toHaveBeenCalledWith('lilly_task_metrics', expect.objectContaining({
    p_from: '2026-10-01', p_to: '2026-10-03', p_empresa: 'Eminat Holding', p_estado: 'Pendiente',
  }))
})
it('rejects invalid date ranges without querying', async () => {
  expect((await GET(request('?from=2026-10-04&to=2026-10-03'))).status).toBe(400)
  expect(rpc).not.toHaveBeenCalled()
})
