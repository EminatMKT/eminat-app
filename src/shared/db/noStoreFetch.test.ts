import { afterEach, describe, expect, it, vi } from 'vitest'
import { noStoreFetch } from './noStoreFetch'

afterEach(() => vi.unstubAllGlobals())

describe('authenticated Supabase fetch', () => {
  it('forces a fresh request while preserving method and authorization headers', async () => {
    const upstream = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', upstream)
    await noStoreFetch('https://example.invalid/rest/v1/sales_activities', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
      cache: 'force-cache',
    })
    expect(upstream).toHaveBeenCalledOnce()
    expect(upstream).toHaveBeenCalledWith(
      'https://example.invalid/rest/v1/sales_activities',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
        cache: 'no-store',
      }),
    )
  })
})
