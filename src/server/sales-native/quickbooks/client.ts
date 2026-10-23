import 'server-only'
import { z } from 'zod'

export const QBO_CALLBACK =
  'https://app.stratixsolutions.us/api/sales-native/quickbooks/oauth/callback'
export const QBO_ACCOUNTING_SCOPE = 'com.intuit.quickbooks.accounting'

const configSchema = z.object({
  clientId: z.string().min(8).max(256),
  clientSecret: z.string().min(8).max(1024),
  redirectUri: z.literal(QBO_CALLBACK),
})
export type QboConfig = z.infer<typeof configSchema>
const tokenSchema = z.object({
  access_token: z.string().min(20).max(16384),
  refresh_token: z.string().min(20).max(16384),
  expires_in: z.number().int().positive().max(86400),
  x_refresh_token_expires_in: z.number().int().positive().max(200_000_000),
  token_type: z.string().toLowerCase().pipe(z.literal('bearer')),
})
export type QboTokens = {
  accessToken: string; refreshToken: string; accessExpiresAt: Date; refreshExpiresAt: Date
}
const companySchema = z.object({ CompanyInfo: z.object({
  Id: z.string().regex(/^[0-9]{1,80}$/),
  CompanyName: z.string().min(1), LegalName: z.string().optional(),
}) })
const qboRef = z.object({ value: z.string().regex(/^[0-9]{1,80}$/) })
const linkedTxn = z.object({ TxnId: z.string().regex(/^[0-9]{1,80}$/),
  TxnType: z.string() })
const invoiceSchema = z.object({ Invoice: z.object({
  Id: z.string().regex(/^[0-9]{1,80}$/), DocNumber: z.string().min(1).max(80),
  CustomerRef: qboRef, TotalAmt: z.number().nonnegative(),
  Balance: z.number().nonnegative(),
  CurrencyRef: z.object({ value: z.string().length(3) }).optional(),
  Line: z.array(z.object({ Amount:z.number().nonnegative(),
    DetailType:z.string().optional(),
    SalesItemLineDetail:z.object({ ItemRef:qboRef,
      Qty:z.number().positive().optional() }).optional() })).optional(),
  LinkedTxn: z.array(linkedTxn).optional(),
}) })
const paymentSchema = z.object({ Payment: z.object({
  Id: z.string().regex(/^[0-9]{1,80}$/), CustomerRef: qboRef,
  TotalAmt: z.number().nonnegative(), TxnDate: z.string().optional(),
  Line: z.array(z.object({ Amount: z.number().nonnegative(),
    LinkedTxn: z.array(linkedTxn).optional() })).optional(),
}) })
export type QboInvoice = z.infer<typeof invoiceSchema>['Invoice']
export type QboPayment = z.infer<typeof paymentSchema>['Payment']

/** Fixed Intuit hosts and callback; no caller-provided provider URL. */
export class QboClient {
  private readonly config: QboConfig
  constructor(config: QboConfig, private readonly request: typeof fetch = fetch) {
    this.config = configSchema.parse(config)
  }

  authorizationUrl(state: string): string {
    if (!/^[A-Za-z0-9_-]{40,100}$/.test(state)) throw new Error('QBO_STATE_INVALID')
    const url = new URL('https://appcenter.intuit.com/connect/oauth2')
    url.searchParams.set('client_id', this.config.clientId)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', QBO_ACCOUNTING_SCOPE)
    url.searchParams.set('redirect_uri', this.config.redirectUri)
    url.searchParams.set('state', state)
    return url.toString()
  }

  private async tokens(body: URLSearchParams): Promise<QboTokens> {
    let response: Response
    try {
      response = await this.request('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        method: 'POST', headers: {
          Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
        }, body, cache: 'no-store', signal: AbortSignal.timeout(10_000),
      })
    } catch { throw new Error('QBO_OAUTH_UNAVAILABLE') }
    if (!response.ok) throw new Error('QBO_OAUTH_UNAVAILABLE')
    let decoded: unknown
    try { decoded = await response.json() }
    catch { throw new Error('QBO_OAUTH_INVALID') }
    const parsed = tokenSchema.safeParse(decoded)
    if (!parsed.success) throw new Error('QBO_OAUTH_INVALID')
    return {
      accessToken: parsed.data.access_token, refreshToken: parsed.data.refresh_token,
      accessExpiresAt: new Date(Date.now() + parsed.data.expires_in * 1000),
      refreshExpiresAt: new Date(Date.now() + parsed.data.x_refresh_token_expires_in * 1000),
    }
  }

  async exchange(code: string): Promise<QboTokens> {
    if (!code || code.length > 4096) throw new Error('QBO_CODE_INVALID')
    return this.tokens(new URLSearchParams({ grant_type: 'authorization_code', code,
      redirect_uri: this.config.redirectUri }))
  }

  async refresh(refreshToken: string): Promise<QboTokens> {
    if (!refreshToken || refreshToken.length > 16384) throw new Error('QBO_TOKEN_INVALID')
    return this.tokens(new URLSearchParams({ grant_type: 'refresh_token',
      refresh_token: refreshToken }))
  }

  /** Intuit requires provider-side revocation when a company disconnects. */
  async revoke(refreshToken: string): Promise<void> {
    if (!refreshToken || refreshToken.length > 16384) throw new Error('QBO_TOKEN_INVALID')
    let response: Response
    try {
      response = await this.request('https://developer.api.intuit.com/v2/oauth2/tokens/revoke', {
        method: 'POST', headers: {
          Accept: 'application/json', 'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
        }, body: JSON.stringify({ token: refreshToken }), cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      })
    } catch { throw new Error('QBO_REVOKE_UNAVAILABLE') }
    if (!response.ok) throw new Error('QBO_REVOKE_UNAVAILABLE')
  }

  async companyInfo(realmId: string, accessToken: string): Promise<{
    id: string; name: string; legalName: string | null }> {
    if (!/^[0-9]{1,80}$/.test(realmId) || !accessToken)
      throw new Error('QBO_COMPANY_INVALID')
    const url = `https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`
    let response: Response
    try { response = await this.request(url, { headers: {
      Authorization: `Bearer ${accessToken}`, Accept: 'application/json',
    }, cache: 'no-store', signal: AbortSignal.timeout(10_000) }) }
    catch { throw new Error('QBO_API_UNAVAILABLE') }
    if (!response.ok) throw new Error('QBO_API_UNAVAILABLE')
    let decoded: unknown
    try { decoded = await response.json() }
    catch { throw new Error('QBO_COMPANY_INVALID') }
    const parsed = companySchema.safeParse(decoded)
    if (!parsed.success)
      throw new Error('QBO_COMPANY_INVALID')
    return { id: realmId, name: parsed.data.CompanyInfo.CompanyName,
      legalName: parsed.data.CompanyInfo.LegalName ?? null }
  }

  private async readEntity<T>(realmId: string, accessToken: string,
    kind: 'invoice' | 'payment', id: string, schema: z.ZodType<T>): Promise<T> {
    if (!/^[0-9]{1,80}$/.test(realmId) || !/^[0-9]{1,80}$/.test(id) || !accessToken)
      throw new Error('QBO_ENTITY_INVALID')
    const url = `https://quickbooks.api.intuit.com/v3/company/${realmId}/${kind}/${id}`
    let response: Response
    try { response = await this.request(url, { headers: {
      Authorization: `Bearer ${accessToken}`, Accept: 'application/json',
    }, cache: 'no-store', signal: AbortSignal.timeout(10_000) }) }
    catch { throw new Error('QBO_ENTITY_UNAVAILABLE') }
    if (!response.ok) throw new Error('QBO_ENTITY_UNAVAILABLE')
    let decoded: unknown
    try { decoded = await response.json() }
    catch { throw new Error('QBO_ENTITY_INVALID') }
    const parsed = schema.safeParse(decoded)
    if (!parsed.success) throw new Error('QBO_ENTITY_INVALID')
    return parsed.data
  }

  async invoice(realmId: string, id: string, accessToken: string): Promise<QboInvoice> {
    const result = await this.readEntity(realmId,accessToken,'invoice',id,invoiceSchema)
    if (result.Invoice.Id !== id) throw new Error('QBO_ENTITY_MISMATCH')
    return result.Invoice
  }

  async payment(realmId: string, id: string, accessToken: string): Promise<QboPayment> {
    const result = await this.readEntity(realmId,accessToken,'payment',id,paymentSchema)
    if (result.Payment.Id !== id) throw new Error('QBO_ENTITY_MISMATCH')
    return result.Payment
  }
}
