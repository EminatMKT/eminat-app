import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const fakes = vi.hoisted(() => ({ guard: vi.fn(), rpc: vi.fn(), rows: vi.fn() }))
vi.mock('@/shared/db/requireAdmin', () => ({ default: fakes.guard }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: () => ({
  rpc: fakes.rpc,
  from: () => ({ select: () => ({ eq: () => ({ order: fakes.rows }) }) }),
}) }))
import { GET, PUT } from './route'

const id = '00000000-0000-4000-8000-000000000001'
const request = (method: string, body?: unknown) => new NextRequest(`http://localhost/api/admin/user-scopes/${id}`,
  { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

describe('admin company grants', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    fakes.guard.mockResolvedValue({ ok: true, userId: 'admin-1' })
  })

  it('rejects non-admin reads before querying', async () => {
    fakes.guard.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' })
    expect((await GET(request('GET'), { params: { id } })).status).toBe(403)
    expect(fakes.rows).not.toHaveBeenCalled()
  })

  it('returns only the selected user’s company codes', async () => {
    fakes.rows.mockResolvedValue({ data: [{ empresa_codigo: 'EMC' }, { empresa_codigo: 'ERG' }], error: null })
    const response = await GET(request('GET'), { params: { id } })
    expect(await response.json()).toEqual({ codes: ['EMC', 'ERG'] })
  })

  it('rejects invalid grants without calling the privileged RPC', async () => {
    expect((await PUT(request('PUT', { codes: ['EMC', '../other'] }), { params: { id } })).status).toBe(400)
    expect(fakes.rpc).not.toHaveBeenCalled()
  })

  it('sends multiple grants to one atomic server-side operation', async () => {
    fakes.rpc.mockResolvedValue({ error: null })
    const response = await PUT(request('PUT', { codes: ['EMC', 'ERG'] }), { params: { id } })
    expect(response.status).toBe(200)
    expect(fakes.rpc).toHaveBeenCalledWith('replace_lilly_user_companies', {
      p_user: id, p_codes: ['EMC', 'ERG'], p_actor: 'admin-1',
    })
  })
})
