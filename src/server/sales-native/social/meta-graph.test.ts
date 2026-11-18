import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MetaGraphClient } from './meta-graph'

const config = { appId: 'app-qa-id', appSecret: 'synthetic-secret-only-123456',
  version: 'v24.0' as const,
  callback: 'https://app.stratixsolutions.us/api/sales-native/social/meta/callback' as const }

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'production'); vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://ruedelunbtaomhrzgelc.supabase.co')
})
afterEach(() => vi.unstubAllEnvs())

describe('server-only Meta Graph adapter', () => {
  it('rejects arbitrary callbacks and Production fallback from an unapproved Preview', () => {
    expect(() => new MetaGraphClient({ ...config, callback: 'https://evil.example/api/sales-native/social/meta/callback' })).toThrow()
    vi.stubEnv('VERCEL_ENV', 'preview')
    expect(() => new MetaGraphClient(config)).toThrow()
  })
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

describe('Phase 1 least privilege discovery',()=>{
 it('does not request ingestion, advertising, message or publishing permissions',()=>{
  const client=new MetaGraphClient(config)
  const url=new URL(client.connectionAuthorizationUrl('a'.repeat(43)))
  expect(url.searchParams.get('scope')).toBe('pages_show_list')
  const instagram=new URL(client.connectionAuthorizationUrl('a'.repeat(43),true))
  expect(instagram.searchParams.get('scope')).toBe('pages_show_list,pages_read_engagement,instagram_basic')
 })
 it('reads Meta authorizer ID without email matching or credential query parameters',async()=>{
  const request=vi.fn(async(url:URL,init:RequestInit)=>{
   expect(url.pathname).toBe('/v24.0/me')
   expect(url.searchParams.toString()).toBe('fields=id')
   expect(init.headers).toEqual({Authorization:'Bearer synthetic-token'})
   return Response.json({id:'principal-1',email:'ignored@example.invalid'})
  })
  expect(await new MetaGraphClient(config,request as never).authorizingUserId('synthetic-token')).toBe('principal-1')
 })
 it('discovers many tokens exceeding the former aggregate 16 KiB limit',async()=>{
  const pages=Array.from({length:30},(_,i)=>({id:`page-${i}`,name:`Page ${i}`,access_token:'synthetic-token-'.repeat(100)}))
  expect(JSON.stringify(pages).length).toBeGreaterThan(16384)
  const client=new MetaGraphClient(config,vi.fn(async()=>Response.json({data:pages})) as never)
  expect(await client.discoverPages('synthetic-token',false)).toHaveLength(30)
 })
 it('rejects oversized provider responses without exposing their bodies',async()=>{
  const request=vi.fn(async()=>new Response('private-token'.repeat(400000)))
  await expect(new MetaGraphClient(config,request as never).authorizingUserId('synthetic-token')).rejects.toThrow('META_PRINCIPAL_UNAVAILABLE')
 })
})

describe('Meta permission health classification',()=>{
 it.each([102,190])('recognizes revoked access code %s without returning provider text',async(code)=>{
  const client=new MetaGraphClient(config,vi.fn(async()=>Response.json({error:{code,message:'private provider body'}},{status:400})) as never)
  expect(await client.connectionHealth('synthetic-token')).toEqual({status:'ACCESS_REVOKED',permissions:[]})
 })
 it('keeps throttling/provider failure distinct from revoked access',async()=>{
  const client=new MetaGraphClient(config,vi.fn(async()=>Response.json({error:{code:4,message:'private'}},{status:429})) as never)
  expect(await client.connectionHealth('synthetic-token')).toEqual({status:'PROVIDER_UNAVAILABLE',permissions:[]})
 })
 it('recognizes missing permissions in a valid grant',async()=>{
  const client=new MetaGraphClient(config,vi.fn(async()=>Response.json({data:[{permission:'pages_show_list',status:'declined'}]})) as never)
  expect(await client.connectionHealth('synthetic-token')).toEqual({status:'PERMISSION_MISSING',permissions:[]})
 })
})
