import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ACCESS_ERRORS } from '@/shared/errors'

const fakes = vi.hoisted(() => ({ getUser: vi.fn(), maybeSingle: vi.fn() }))
const profileQuery = () => ({ select: () => ({ eq: () => ({ maybeSingle: fakes.maybeSingle }) }) })
vi.mock('@/shared/db/requireAccess/ssrClient', () => ({ default: () => ({ auth: { getUser: fakes.getUser } }) }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: () => ({ from: profileQuery }) }))

import requireAdmin from './index'

const SIGNED_IN = { data: { user: { id: 'auth-1' } } }
const FORBIDDEN = { ok: false, status: 403, error: ACCESS_ERRORS.adminRequired }

describe('requireAdmin', () => {
  beforeEach(() => { fakes.getUser.mockReset(); fakes.maybeSingle.mockReset() })

  it('nobody signed in → 401', async () => {
    fakes.getUser.mockResolvedValueOnce({ data: { user: null } })
    expect(await requireAdmin()).toEqual({ ok: false, status: 401, error: ACCESS_ERRORS.notAuthenticated })
  })
  it('signed in without a profile row → 403', async () => {
    fakes.getUser.mockResolvedValueOnce(SIGNED_IN)
    fakes.maybeSingle.mockResolvedValueOnce({ data: null })
    expect(await requireAdmin()).toEqual(FORBIDDEN)
  })
  it('signed in with a non-admin role → 403', async () => {
    fakes.getUser.mockResolvedValueOnce(SIGNED_IN)
    fakes.maybeSingle.mockResolvedValueOnce({ data: { id: 'u-1', rol: 'sin_asignar' } })
    expect(await requireAdmin()).toEqual(FORBIDDEN)
  })
  it('an admin → ok with the profile id, not the auth id', async () => {
    fakes.getUser.mockResolvedValueOnce(SIGNED_IN)
    fakes.maybeSingle.mockResolvedValueOnce({ data: { id: 'u-1', rol: 'admin' } })
    expect(await requireAdmin()).toEqual({ ok: true, userId: 'u-1' })
  })
})
