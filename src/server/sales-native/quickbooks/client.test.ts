import { describe, expect, it, vi } from 'vitest'
import { QboClient, QBO_CALLBACK, QBO_ACCOUNTING_SCOPE } from './client'

const config = { clientId: 'synthetic-client-1234',
  clientSecret: 'synthetic-secret-1234', redirectUri: QBO_CALLBACK as typeof QBO_CALLBACK }
const reply = { access_token: 'synthetic-access-token-123456789',
  refresh_token: 'synthetic-refresh-token-123456789', expires_in: 3600,
  x_refresh_token_expires_in: 8640000, token_type: 'bearer' }

describe('LILLY QBO OAuth boundary', () => {
  it('binds authorization to the LILLY callback and accounting scope', () => {
    const url = new URL(new QboClient(config).authorizationUrl('a'.repeat(43)))
    expect(url.origin).toBe('https://appcenter.intuit.com')
    expect(url.searchParams.get('redirect_uri')).toBe(QBO_CALLBACK)
    expect(url.searchParams.get('scope')).toBe(QBO_ACCOUNTING_SCOPE)
    expect(url.searchParams.get('state')).toBe('a'.repeat(43))
    expect(() => new QboClient({ ...config,
      redirectUri: 'https://annie.stratixsolutions.us/callback' as typeof QBO_CALLBACK }))
      .toThrow()
  })

  it('exchanges once through Intuit without credentials in the URL', async () => {
    const request = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer')
      expect(init.method).toBe('POST')
      expect(String(init.body)).toContain('grant_type=authorization_code')
      expect(String(init.body)).toContain(encodeURIComponent(QBO_CALLBACK))
      return Response.json(reply)
    })
    const result = await new QboClient(config,request as unknown as typeof fetch).exchange('code-qa')
    expect(result.refreshToken).toBe(reply.refresh_token)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('rotates the refresh token and reads only the selected company', async () => {
    const request = vi.fn(async (url: string, init: RequestInit) => {
      if (url.includes('/tokens/bearer')) return Response.json(reply)
      expect(url).toMatch(/^https:\/\/quickbooks\.api\.intuit\.com\/v3\/company\/\d+\/companyinfo\/\d+$/)
      expect(init.method).toBeUndefined()
      return Response.json({ CompanyInfo: { Id: '123',
        CompanyName: 'Eminat Medical Center LLC' } })
    })
    const client = new QboClient(config,request as unknown as typeof fetch)
    expect((await client.refresh('old-refresh-token')).refreshToken).toBe(reply.refresh_token)
    expect((await client.companyInfo('123',reply.access_token)).name)
      .toBe('Eminat Medical Center LLC')
    await expect(client.companyInfo('456',reply.access_token)).rejects
      .toThrow('QBO_COMPANY_INVALID')
  })

  it('revokes a refresh token at the official endpoint on disconnect', async () => {
    const request = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://developer.api.intuit.com/v2/oauth2/tokens/revoke')
      expect(init.method).toBe('POST')
      expect(JSON.parse(String(init.body))).toEqual({ token: 'synthetic-refresh-token' })
      return new Response(null,{ status: 200 })
    })
    await new QboClient(config,request as unknown as typeof fetch)
      .revoke('synthetic-refresh-token')
    expect(request).toHaveBeenCalledTimes(1)
  })
})
