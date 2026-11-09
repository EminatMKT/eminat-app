import { describe, expect, it, vi } from 'vitest'
import { QboClient, QBO_CALLBACK, QBO_ACCOUNTING_SCOPE, patientInvoiceNumber } from './client'

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
      return Response.json({ CompanyInfo: { Id: '1',
        CompanyName: 'Eminat Medical Center LLC' } })
    })
    const client = new QboClient(config,request as unknown as typeof fetch)
    expect((await client.refresh('old-refresh-token')).refreshToken).toBe(reply.refresh_token)
    expect((await client.companyInfo('123',reply.access_token)).name)
      .toBe('Eminat Medical Center LLC')
    await expect(client.companyInfo('not-a-realm',reply.access_token)).rejects
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

  it('reads invoice and payment evidence without sending a financial write', async () => {
    const request = vi.fn(async (url: string, init: RequestInit) => {
      expect(init.method).toBeUndefined()
      expect(init.cache).toBe('no-store')
      if (url.endsWith('/invoice/1133')) return Response.json({ Invoice: {
        Id:'1133',DocNumber:'1133',CustomerRef:{ value:'321' },
        TotalAmt:199.98,Balance:0,LinkedTxn:[{ TxnId:'900',TxnType:'Payment' }],
      } })
      if (url.endsWith('/payment/900')) return Response.json({ Payment: {
        Id:'900',CustomerRef:{ value:'321' },TotalAmt:199.98,
        Line:[{ Amount:199.98,LinkedTxn:[{ TxnId:'1133',TxnType:'Invoice' }] }],
      } })
      throw new Error('unexpected request')
    })
    const client = new QboClient(config,request as unknown as typeof fetch)
    expect((await client.invoice('123','1133','synthetic-access')).Balance).toBe(0)
    expect((await client.payment('123','900','synthetic-access')).Id).toBe('900')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('creates one non-taxable invoice with a stable number for custom-number companies', async () => {
    const request = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://quickbooks.api.intuit.com/v3/company/123/invoice')
      expect(init.method).toBe('POST')
      const body = JSON.parse(String(init.body))
      expect(body.CustomerRef.value).toBe('321')
      expect(body.Line[0].SalesItemLineDetail).toEqual({ ItemRef:{ value:'7' },
        Qty:1,UnitPrice:119.98,TaxCodeRef:{ value:'NON' } })
      expect(body.DocNumber).toBe(patientInvoiceNumber('intent-qa'))
      expect(body.AllowOnlineCreditCardPayment).toBe(true)
      expect(body.EmailStatus).toBe('NotSet')
      return Response.json({ Invoice:{ Id:'1134',DocNumber:body.DocNumber,
        CustomerRef:{value:'321'},TotalAmt:119.98,Balance:119.98,
        Line:[{Amount:119.98,DetailType:'SalesItemLineDetail',
          SalesItemLineDetail:{ItemRef:{value:'7'},Qty:1}}] } })
    })
    const invoice = await new QboClient(config,request as unknown as typeof fetch)
      .createInvoice('123','synthetic-access',{ customerId:'321',itemId:'7',
        email:'qa@example.com',amountCents:11998,intentId:'intent-qa' })
    expect(invoice.Id).toBe('1134')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('numbers one already-created invoice without creating another', async () => {
    const request = vi.fn(async (url: string, init: RequestInit) => {
      if (init.method === 'GET') return Response.json({ Invoice:{
        Id:'808',DocNumber:null,SyncToken:'0',PrivateNote:'LILLY enrollment intent-qa',
        CustomerRef:{value:'321'},TotalAmt:159.98,Balance:159.98,
        Line:[{Amount:159.98,DetailType:'SalesItemLineDetail',
          SalesItemLineDetail:{ItemRef:{value:'7'},Qty:1}}],
      } })
      const body = JSON.parse(String(init.body))
      expect(body).toEqual({sparse:true,Id:'808',SyncToken:'0',
        DocNumber:patientInvoiceNumber('intent-qa')})
      return Response.json({Invoice:{Id:'808',DocNumber:body.DocNumber,
        CustomerRef:{value:'321'},TotalAmt:159.98,Balance:159.98,
        Line:[{Amount:159.98,DetailType:'SalesItemLineDetail',
          SalesItemLineDetail:{ItemRef:{value:'7'},Qty:1}}]}})
    })
    const client = new QboClient(config,request as unknown as typeof fetch)
    const existing = await client.invoiceForRecovery('123','synthetic-access','808')
    const recovered = await client.numberExistingInvoice('123','synthetic-access',existing,'intent-qa')
    expect(recovered.DocNumber).toBe(patientInvoiceNumber('intent-qa'))
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('treats an ambiguous provider write as unsafe to repeat', async () => {
    const request = vi.fn(async () => { throw new Error('network closed after write') })
    await expect(new QboClient(config,request as unknown as typeof fetch)
      .createCustomer('123','synthetic-access',{ displayName:'QA',firstName:'QA',
        lastName:'Patient',email:'qa@example.com' }))
      .rejects.toThrow('QBO_WRITE_OUTCOME_UNKNOWN')
    expect(request).toHaveBeenCalledTimes(1)
  })
})
