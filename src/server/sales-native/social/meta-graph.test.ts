import { describe, expect, it, vi } from 'vitest'
import { MetaGraphClient } from './meta-graph'

const config = { appId: 'app-qa-id', appSecret: 'synthetic-secret-only-123456',
  version: 'v24.0' as const,
  callback: 'https://app.stratixsolutions.us/api/sales-native/social/meta/callback' as const }

describe('server-only Meta Graph adapter', () => {
  it('binds OAuth to one callback and only reviewed scopes', () => {
    const client = new MetaGraphClient(config)
    const url = new URL(client.authorizationUrl('a'.repeat(43), ['pages_messaging']))
    expect(url.origin).toBe('https://www.facebook.com')
    expect(url.searchParams.get('redirect_uri')).toBe(config.callback)
    expect(url.searchParams.get('scope')).toContain('leads_retrieval')
    expect(() => client.authorizationUrl('a'.repeat(43), ['unknown_scope'])).toThrow('META_SCOPE_INVALID')
  })

  it('exchanges a code without placing credentials in the URL', async () => {
    const request = vi.fn(async (url: URL, init: RequestInit) => {
      expect(url.origin).toBe('https://graph.facebook.com')
      expect(url.searchParams.size).toBe(0)
      expect(init.method).toBe('POST')
      return Response.json({ access_token: 'synthetic-token-12345', expires_in: 3600 })
    })
    const client = new MetaGraphClient(config, request as unknown as typeof fetch)
    const result = await client.exchange('synthetic-code')
    expect(result.token).toBe('synthetic-token-12345')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('refreshes an existing user token without credentials in the URL', async () => {
    const request = vi.fn(async (url: URL, init: RequestInit) => {
      expect(url.searchParams.size).toBe(0)
      expect(init.method).toBe('POST')
      expect(String(init.body)).toContain('fb_exchange_token=synthetic-old-token')
      return Response.json({ access_token: 'synthetic-new-token-12345', expires_in: 3600 })
    })
    const client = new MetaGraphClient(config, request as unknown as typeof fetch)
    expect((await client.refreshUserToken('synthetic-old-token')).token)
      .toBe('synthetic-new-token-12345')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('discovers bounded pages with server credentials and cursor paging', async () => {
    const request = vi.fn(async (url: URL, init: RequestInit) => {
      expect(init.headers).toEqual({ Authorization: 'Bearer synthetic-user-token' })
      return Response.json({ data: [{ id: 'page-qa', name: 'QA Page',
        access_token: 'synthetic-page-token-12345' }] })
    })
    const client = new MetaGraphClient(config, request as unknown as typeof fetch)
    expect(await client.discoverPages('synthetic-user-token')).toHaveLength(1)
  })

  it('falls back only when the optional Business field is rejected', async () => {
    const request = vi.fn(async (url: URL) => url.searchParams.get('fields')?.includes('business{')
      ? new Response('', { status: 400 })
      : Response.json({ data: [{ id: 'page-qa', name: 'QA Page',
        access_token: 'synthetic-page-token-12345' }] }))
    const client = new MetaGraphClient(config, request as unknown as typeof fetch)
    expect(await client.discoverPages('synthetic-user-token')).toHaveLength(1)
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('subscribes only reviewed fields and requires provider confirmation', async () => {
    const request = vi.fn(async (_url: URL, init: RequestInit) => {
      expect(init.headers).toEqual({ Authorization: 'Bearer synthetic-page-token',
        'Content-Type': 'application/x-www-form-urlencoded' })
      expect(String(init.body)).toContain('leadgen')
      return Response.json({ success: true })
    })
    const client = new MetaGraphClient(config, request as unknown as typeof fetch)
    await client.subscribePage('page-qa', 'synthetic-page-token', ['leadgen'])
    await expect(client.subscribePage('page-qa', 'synthetic-page-token', ['not_allowed']))
      .rejects.toThrow('META_SUBSCRIPTION_INVALID')
  })

  it('reports only permissions actually granted', async () => {
    const client = new MetaGraphClient(config,
      vi.fn(async () => Response.json({ data: [
        { permission: 'leads_retrieval', status: 'granted' },
        { permission: 'pages_messaging', status: 'declined' },
      ] })) as unknown as typeof fetch)
    expect(await client.grantedPermissions('synthetic-user-token')).toEqual(['leads_retrieval'])
  })
})
