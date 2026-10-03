import { describe, it, expect, vi } from 'vitest'
import { ACCESS_ERRORS } from '@/shared/errors'

const getUser = vi.hoisted(() => vi.fn())
vi.mock('@/shared/db/requireAccess/ssrClient', () => ({ default: () => ({ auth: { getUser } }) }))

import requireSignedIn from './index'

describe('requireSignedIn', () => {
  it('nobody signed in → 401', async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } })
    expect(await requireSignedIn()).toEqual({ ok: false, status: 401, error: ACCESS_ERRORS.notAuthenticated })
  })
  it('a signed-in user → ok with the auth user id', async () => {
    getUser.mockResolvedValueOnce({ data: { user: { id: 'auth-1' } } })
    expect(await requireSignedIn()).toEqual({ ok: true, userId: 'auth-1' })
  })
})
