import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireAdmin, rpc, roleRow, userCount, removal } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  rpc: vi.fn(),
  roleRow: vi.fn(),
  userCount: vi.fn(),
  removal: vi.fn(),
}))
vi.mock('@/shared/db/requireAdmin', () => ({ default: requireAdmin }))
vi.mock('@/server/db', () => {
  const tables: Record<string, unknown> = {
    usuarios: { select: () => ({ eq: userCount }) },
    roles: { select: () => ({ eq: () => ({ maybeSingle: roleRow }) }), delete: () => ({ eq: removal }) },
  }
  return { supabaseAdmin: () => ({ rpc, from: (table: string) => tables[table] }) }
})

import { DELETE, PATCH } from '../route'

const URL = 'https://app.stratixsolutions.us/api/admin/roles/soporte'
const init = (payload: unknown) => ({ method: 'PATCH', body: JSON.stringify(payload) })
const context = { params: { key: 'soporte' } }
const patch = (payload: unknown) => PATCH(new Request(URL, init(payload)), context)
const remove = () => DELETE(new Request(URL), context)
const admin = { ok: true, status: 200 }
const notAdmin = { ok: false, status: 401, error: 'Unauthorized' }
const ok = { error: null }
const PATCH_LABEL = { label: 'Soporte' }
const PATCH_UNKNOWN = { modules: ['nope'] }
const PATCH_MODULES = { modules: ['directorio'] }
const SAVE_LABEL = {
  p_key: 'soporte',
  p_label: 'Soporte',
  p_modules: null,
  p_is_new: false,
}
const MISSING_ROLE = { error: { code: 'P0002', message: 'not found' } }

describe('PATCH /api/admin/roles/[key]', () => {
  beforeEach(() => { vi.clearAllMocks(); requireAdmin.mockResolvedValue(admin); rpc.mockResolvedValue(ok) })
  it('answers the guard status before saving anything', async () => {
    requireAdmin.mockResolvedValue(notAdmin)
    const response = await patch(PATCH_LABEL)
    expect(response.status).toBe(401)
    expect(rpc).not.toHaveBeenCalled()
  })
  it('rejects a module the catalog does not know', async () => {
    const response = await patch(PATCH_UNKNOWN)
    expect(response.status).toBe(400)
  })
  it('a label-only edit leaves the modules untouched', async () => {
    await patch(PATCH_LABEL)
    expect(rpc).toHaveBeenCalledWith('save_role', SAVE_LABEL)
  })
  it('answers 404 when save_role does not find the role', async () => {
    rpc.mockResolvedValue(MISSING_ROLE)
    const response = await patch(PATCH_MODULES)
    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/admin/roles/[key]', () => {
  beforeEach(() => { vi.clearAllMocks(); requireAdmin.mockResolvedValue(admin); removal.mockResolvedValue(ok) })
  it('refuses to delete a system role', async () => {
    const system = { data: { is_system: true } }
    roleRow.mockResolvedValue(system)
    expect((await remove()).status).toBe(400)
    expect(removal).not.toHaveBeenCalled()
  })
  it('refuses while users still hold the role, and deletes once nobody does', async () => {
    const custom = { data: { is_system: false } }
    roleRow.mockResolvedValue(custom)
    userCount.mockResolvedValueOnce({ count: 2 }).mockResolvedValueOnce({ count: 0 })
    expect((await remove()).status).toBe(400)
    expect((await remove()).status).toBe(200)
    expect(removal).toHaveBeenCalledTimes(1)
  })
})
