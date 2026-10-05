import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireAdmin, rpc, existing } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  rpc: vi.fn(),
  existing: vi.fn(),
}))
vi.mock('@/shared/db/requireAdmin', () => ({ default: requireAdmin }))
vi.mock('@/server/db', () => ({
  supabaseAdmin: () => ({
    from: () => ({ select: () => ({ overrideTypes: existing }) }),
    rpc,
  }),
}))

import { POST } from '../route'

const URL = 'https://app.stratixsolutions.us/api/admin/roles'
const init = (payload: unknown) => ({ method: 'POST', body: JSON.stringify(payload) })
const request = (payload: unknown) => new Request(URL, init(payload))
const admin = { ok: true, status: 200 }
const notAdmin = { ok: false, status: 403, error: 'Forbidden' }
const roles = { data: [{ key: 'admin', label: 'Administrador', is_system: true }] }
const saved = { error: null }
const duplicate = { error: { code: '23505', message: 'duplicate key' } }
const soporte = { label: 'Soporte' }

describe('POST /api/admin/roles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAdmin.mockResolvedValue(admin)
    existing.mockResolvedValue(roles)
    rpc.mockResolvedValue(saved)
  })

  it('answers the guard status to a caller who is not admin, before reading anything', async () => {
    requireAdmin.mockResolvedValue(notAdmin)
    const response = await POST(request(soporte))
    expect(response.status).toBe(403)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects a module the catalog does not know', async () => {
    const unknownModule = { label: 'Soporte', modules: ['nope'] }
    const response = await POST(request(unknownModule))
    expect(response.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects a label another role already holds', async () => {
    const taken = { label: 'administrador' }
    const response = await POST(request(taken))
    expect(response.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('creates the role and its modules in one save_role call and answers 201 with the key', async () => {
    const withModules = { label: 'Soporte', modules: ['directorio'] }
    const params = {
      p_key: 'soporte',
      p_label: 'Soporte',
      p_modules: ['directorio'],
      p_is_new: true,
    }
    const response = await POST(request(withModules))
    expect(rpc).toHaveBeenCalledWith('save_role', params)
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ key: 'soporte' })
  })

  it('maps a duplicate raised by save_role to its message', async () => {
    rpc.mockResolvedValue(duplicate)
    const response = await POST(request(soporte))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'A role with that key or label already exists.' })
  })
})
