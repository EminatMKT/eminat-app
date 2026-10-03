import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { ADMIN_ERRORS } from '@/shared/errors'

const { requireAdmin, users, update } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  users: { rows: new Array<{ id: string; rol: string }>() },
  update: vi.fn(),
}))
vi.mock('@/shared/db/requireAdmin', () => ({ default: requireAdmin }))
vi.mock('@/shared/db/supabaseAdmin', () => ({
  supabaseAdmin: () => ({
    from: () => ({
      select: () => Object.assign(Promise.resolve({ data: users.rows }), {
        eq: () => ({ single: async () => ({ data: { id: 'saved' } }) }),
      }),
      update,
    }),
  }),
}))

import { POST } from '../route'

const URL = 'https://app.stratixsolutions.us/api/admin/update-user'
const init = (payload: unknown) => ({ method: 'POST', body: JSON.stringify(payload) })
const request = (payload: unknown) => new NextRequest(URL, init(payload))
const admin = { ok: true, status: 200 }
const demote = (id: string) => ({ id, rol: 'sin_asignar' })
const written = { eq: async () => ({ error: null, count: 1 }) }

describe('POST /api/admin/update-user — last-admin guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    requireAdmin.mockResolvedValue(admin)
    update.mockReturnValue(written)
  })

  it('demoting the only admin is 400 lastAdminDemote, and nothing is written', async () => {
    users.rows = [{ id: 'a-1', rol: 'admin' }, { id: 'u-2', rol: 'mkt' }]
    const response = await POST(request(demote('a-1')))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: ADMIN_ERRORS.lastAdminDemote })
    expect(update).not.toHaveBeenCalled()
  })

  it('demoting one of two admins goes through to the write', async () => {
    users.rows = [{ id: 'a-1', rol: 'admin' }, { id: 'a-2', rol: 'admin' }]
    const response = await POST(request(demote('a-1')))
    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledOnce()
  })

  it('keeping the only admin as admin is not a demotion', async () => {
    users.rows = [{ id: 'a-1', rol: 'admin' }]
    const response = await POST(request({ id: 'a-1', rol: 'admin' }))
    expect(response.status).toBe(200)
  })
})
