import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getUser, update, eqUser, eqAuth } = vi.hoisted(() => ({
  getUser: vi.fn(), update: vi.fn(), eqUser: vi.fn(), eqAuth: vi.fn(),
}))
vi.mock('@/shared/db/requireAccess/ssrClient', () => ({
  default: () => ({
    auth: { getUser },
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'person-1', avatar_key: null }, error: null }) }) }) }),
      update,
    }),
  }),
}))

import { PATCH } from './route'

const request = (body: unknown) => new NextRequest('https://app.stratixsolutions.us/api/profile', {
  method: 'PATCH', body: JSON.stringify(body),
})

describe('PATCH /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
    eqAuth.mockReturnValue({ select: () => ({ maybeSingle: async () => ({ data: { id: 'person-1', avatar_key: 'cat' }, error: null }) }) })
    eqUser.mockReturnValue({ eq: eqAuth })
    update.mockReturnValue({ eq: eqUser })
  })

  it('rejects attempts to change anything besides the catalog avatar', async () => {
    for (const body of [
      { avatar_key: 'cat', rol: 'admin' },
      { avatar_key: 'uploaded-image-url' },
      { avatar_key: 'lizard' },
      { avatar_key: 'seal' },
      { nombre: 'Changed' },
    ]) {
      const response = await PATCH(request(body))
      expect(response.status).toBe(400)
    }
    expect(update).not.toHaveBeenCalled()
  })

  it('writes the selected avatar only for the authenticated user row', async () => {
    const response = await PATCH(request({ avatar_key: 'cat' }))
    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledWith({ avatar_key: 'cat' })
    expect(eqUser).toHaveBeenCalledWith('id', 'person-1')
    expect(eqAuth).toHaveBeenCalledWith('auth_id', 'auth-1')
  })
})
