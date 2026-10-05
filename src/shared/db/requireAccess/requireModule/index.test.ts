import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ACCESS_ERRORS } from '@/shared/errors'
import { MODULE } from '@/shared/auth/permissions'

const fakes = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }))
vi.mock('@/shared/db/requireAccess/ssrClient', () => ({ default: () => ({ auth: { getUser: fakes.getUser }, rpc: fakes.rpc }) }))

import requireModule from './index'

const SIGNED_IN = { data: { user: { id: 'auth-1' } } }

describe('requireModule', () => {
  beforeEach(() => { fakes.getUser.mockReset(); fakes.rpc.mockReset() })

  it('nobody signed in → 401, without asking the database for the module', async () => {
    fakes.getUser.mockResolvedValueOnce({ data: { user: null } })
    expect(await requireModule(MODULE.RESEARCH)).toEqual({ ok: false, status: 401, error: ACCESS_ERRORS.notAuthenticated })
    expect(fakes.rpc).not.toHaveBeenCalled()
  })
  it('signed in without the module → 403 naming it', async () => {
    fakes.getUser.mockResolvedValueOnce(SIGNED_IN)
    fakes.rpc.mockResolvedValueOnce({ data: false })
    const denied = { ok: false, status: 403, error: ACCESS_ERRORS.moduleRequired(MODULE.RESEARCH) }
    expect(await requireModule(MODULE.RESEARCH)).toEqual(denied)
  })
  it('signed in with the module → ok, asked through has_module(slug)', async () => {
    fakes.getUser.mockResolvedValueOnce(SIGNED_IN)
    fakes.rpc.mockResolvedValueOnce({ data: true })
    expect(await requireModule(MODULE.RESEARCH)).toEqual({ ok: true, userId: 'auth-1' })
    expect(fakes.rpc).toHaveBeenCalledWith('has_module', { p_slug: MODULE.RESEARCH })
  })
})
