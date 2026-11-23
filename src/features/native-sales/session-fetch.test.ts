import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: { auth: { getSession: mocks.getSession } } }))

import { sessionFetch } from './session-fetch'

beforeEach(() => {
  mocks.getSession.mockReset().mockResolvedValue({ data: { session: { access_token: 'synthetic-token' } } })
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('sessionFetch (PR #209 review finding #9)', () => {
  it('attaches the session Authorization header to the request', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ foo: 'bar' }) } as Response)
    const result = await sessionFetch('social/connections')
    expect(fetch).toHaveBeenCalledWith('/api/sales-native/social/connections',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer synthetic-token' }) }))
    expect(result).toEqual({ foo: 'bar' })
  })
  it('falls back to a stable code, not a raw SyntaxError, when an error response body is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, json: async () => { throw new SyntaxError('Unexpected token') } } as unknown as Response)
    await expect(sessionFetch('social/connections')).rejects.toThrow('META_CONNECTION_UNAVAILABLE')
  })
  it('surfaces the real code from a JSON error body instead of the generic fallback', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({ code: 'META_PROVIDER_DISABLED' }) } as Response)
    await expect(sessionFetch('social/connections')).rejects.toThrow('META_PROVIDER_DISABLED')
  })
})
