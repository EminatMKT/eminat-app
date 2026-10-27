import 'server-only'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import type {FamilyInvoiceLine} from './family-invoice-lines'

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
const customerSchema = z.object({ Id: z.string().regex(/^[0-9]{1,80}$/),
  DisplayName: z.string().min(1), Active: z.boolean().optional(),
  PrimaryEmailAddr: z.object({ Address: z.string().email() }).optional() })
const itemSchema = z.object({ Id: z.string().regex(/^[0-9]{1,80}$/),
  Name: z.string().min(1), FullyQualifiedName: z.string().optional(),
  Active: z.boolean().optional(), UnitPrice: z.number().optional(),
  Taxable: z.boolean().optional() })
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
      Qty:z.number().positive().optional(),UnitPrice:z.number().nonnegative().optional() }).optional() })).optional(),
  LinkedTxn: z.array(linkedTxn).optional(),
  InvoiceLink: z.string().url().optional(),
  TxnTaxDetail: z.object({ TotalTax: z.number().optional() }).optional(),
}) })
const recoveryInvoiceSchema = z.object({ Invoice: invoiceSchema.shape.Invoice.extend({
  DocNumber: z.string().max(80).nullish(),
  SyncToken: z.string().min(1),
  PrivateNote: z.string().optional(),
}) })
const paymentSchema = z.object({ Payment: z.object({
  Id: z.string().regex(/^[0-9]{1,80}$/), CustomerRef: qboRef,
  TotalAmt: z.number().nonnegative(), TxnDate: z.string().optional(),
  Line: z.array(z.object({ Amount: z.number().nonnegative(),
    LinkedTxn: z.array(linkedTxn).optional() })).optional(),
}) })
export type QboInvoice = z.infer<typeof invoiceSchema>['Invoice']
export type QboRecoveryInvoice = z.infer<typeof recoveryInvoiceSchema>['Invoice']
export type QboPayment = z.infer<typeof paymentSchema>['Payment']
export type QboCustomer = z.infer<typeof customerSchema>
export type QboItem = z.infer<typeof itemSchema>

/** QuickBooks companies with custom transaction numbers leave DocNumber blank
 * unless the application supplies one. Keep this stable across retries. */
export function patientInvoiceNumber(intentId: string): string {
  return `CS-${createHash('sha256').update(intentId).digest('hex').slice(0,16).toUpperCase()}`
}

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

  private async accounting(realmId: string, accessToken: string,
    path: string, body?: object): Promise<unknown> {
    if (!/^[0-9]{1,80}$/.test(realmId) || !accessToken)
      throw new Error('QBO_ENTITY_INVALID')
    const url = `https://quickbooks.api.intuit.com/v3/company/${realmId}/${path}`
    let response: Response
    try { response = await this.request(url, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store', signal: AbortSignal.timeout(10_000),
    }) } catch { throw new Error('QBO_WRITE_OUTCOME_UNKNOWN') }
    // A failed POST can still have reached Intuit. The caller must never retry
    // automatically until it has reconciled the provider-side outcome.
    if (!response.ok) throw new Error(body ? 'QBO_WRITE_OUTCOME_UNKNOWN' : 'QBO_API_UNAVAILABLE')
    try { return await response.json() }
    catch { throw new Error(body ? 'QBO_WRITE_OUTCOME_UNKNOWN' : 'QBO_ENTITY_INVALID') }
  }

  private async query<T>(realmId: string, accessToken: string, entity: 'Customer'|'Item',
    clause: string, schema: z.ZodType<T>): Promise<T[]> {
    const sql = `select * from ${entity} where ${clause} maxresults 1000`
    const payload = await this.accounting(realmId, accessToken,
      `query?query=${encodeURIComponent(sql)}`)
    const parsed = z.object({ QueryResponse: z.record(z.string(), z.unknown()) }).safeParse(payload)
    if (!parsed.success) throw new Error('QBO_QUERY_INVALID')
    const rows = parsed.data.QueryResponse[entity] ?? []
    const result = z.array(schema).safeParse(rows)
    if (!result.success) throw new Error('QBO_QUERY_INVALID')
    return result.data
  }

  async customersByEmail(realmId: string, accessToken: string, email: string): Promise<QboCustomer[]> {
    if (!/^[^\s@']+@[^\s@']+\.[^\s@']+$/.test(email) || email.length > 320)
      throw new Error('QBO_CUSTOMER_EMAIL_INVALID')
    const rows = await this.query(realmId,accessToken,'Customer',
      `PrimaryEmailAddr = '${email}'`,customerSchema)
    return rows.filter(row => row.PrimaryEmailAddr?.Address.toLowerCase() === email.toLowerCase())
  }

  async customer(realmId: string, id: string, accessToken: string): Promise<QboCustomer> {
    if (!/^[0-9]{1,80}$/.test(id)) throw new Error('QBO_ENTITY_INVALID')
    const payload = await this.accounting(realmId,accessToken,`customer/${id}`)
    const parsed = z.object({ Customer:customerSchema }).safeParse(payload)
    if (!parsed.success || parsed.data.Customer.Id !== id) throw new Error('QBO_ENTITY_INVALID')
    return parsed.data.Customer
  }

  async itemByName(realmId: string, accessToken: string, name: string): Promise<QboItem> {
    if (!name || name.length > 200) throw new Error('QBO_ITEM_NAME_INVALID')
    const rows = await this.query(realmId,accessToken,'Item',
      `Name = '${name.replaceAll("'", "\\'")}'`,itemSchema)
    const matches = rows.filter(row => row.Name === name && row.Active !== false)
    if (matches.length !== 1) throw new Error('QBO_ITEM_MAPPING_REQUIRED')
    return matches[0]
  }

  async createCustomer(realmId: string, accessToken: string, input: {
    displayName: string; firstName: string; lastName: string; email: string }): Promise<QboCustomer> {
    const payload = await this.accounting(realmId,accessToken,'customer',{
      DisplayName:input.displayName,GivenName:input.firstName,FamilyName:input.lastName,
      PrimaryEmailAddr:{ Address:input.email },
    })
    const parsed = z.object({ Customer:customerSchema }).safeParse(payload)
    if (!parsed.success) throw new Error('QBO_WRITE_OUTCOME_UNKNOWN')
    return parsed.data.Customer
  }

  async createInvoice(realmId: string, accessToken: string, input: {
    customerId: string; itemId: string; email: string; amountCents: number;
    intentId: string;familyLines?:FamilyInvoiceLine[] }): Promise<QboInvoice> {
    if (!/^[0-9]{1,80}$/.test(input.customerId) || !/^[0-9]{1,80}$/.test(input.itemId)
      || !Number.isSafeInteger(input.amountCents) || input.amountCents <= 0)
      throw new Error('QBO_INVOICE_INPUT_INVALID')
    const amount = input.amountCents/100
    if(input.familyLines && (!input.familyLines.length || input.familyLines.length>2 || input.familyLines.some(line=>
      !Number.isSafeInteger(line.quantity) || line.quantity<1 || line.quantity>9 || !Number.isSafeInteger(line.unitCents) || line.unitCents<=0 ||
      !line.description || line.description.length>240) || input.familyLines.reduce((sum,line)=>sum+line.quantity*line.unitCents,0)!==input.amountCents))
      throw new Error('QBO_INVOICE_INPUT_INVALID')
    const payload = await this.accounting(realmId,accessToken,'invoice',{
      CustomerRef:{ value:input.customerId },BillEmail:{ Address:input.email },
      EmailStatus:'NotSet',PrivateNote:`LILLY enrollment ${input.intentId}`,
      DocNumber:patientInvoiceNumber(input.intentId),
      AllowOnlineCreditCardPayment:true,AllowOnlineACHPayment:true,
      Line:input.familyLines ? input.familyLines.map(line=>({Amount:line.quantity*line.unitCents/100,Description:line.description,DetailType:'SalesItemLineDetail',
        SalesItemLineDetail:{ItemRef:{value:input.itemId},Qty:line.quantity,UnitPrice:line.unitCents/100,TaxCodeRef:{value:'NON'}}})) : [{ Amount:amount,DetailType:'SalesItemLineDetail',
        SalesItemLineDetail:{ ItemRef:{ value:input.itemId },Qty:1,UnitPrice:amount,
          TaxCodeRef:{ value:'NON' } } }],
    })
    const parsed = invoiceSchema.safeParse(payload)
    if (!parsed.success) throw new Error('QBO_WRITE_OUTCOME_UNKNOWN')
    return parsed.data.Invoice
  }

  async invoiceForRecovery(realmId: string, accessToken: string, id: string): Promise<QboRecoveryInvoice> {
    if (!/^[0-9]{1,80}$/.test(id)) throw new Error('QBO_ENTITY_INVALID')
    const payload = await this.accounting(realmId,accessToken,`invoice/${id}`)
    const parsed = recoveryInvoiceSchema.safeParse(payload)
    if (!parsed.success || parsed.data.Invoice.Id !== id) throw new Error('QBO_ENTITY_INVALID')
    return parsed.data.Invoice
  }

  async numberExistingInvoice(realmId: string, accessToken: string,
    invoice: QboRecoveryInvoice, intentId: string): Promise<QboInvoice> {
    const number = patientInvoiceNumber(intentId)
    if (invoice.DocNumber && invoice.DocNumber !== number) throw new Error('QBO_INVOICE_NUMBER_CONFLICT')
    if (invoice.DocNumber) return invoice as QboInvoice
    const payload = await this.accounting(realmId,accessToken,'invoice',{
      sparse:true,Id:invoice.Id,SyncToken:invoice.SyncToken,DocNumber:number,
    })
    const parsed = invoiceSchema.safeParse(payload)
    if (!parsed.success || parsed.data.Invoice.Id !== invoice.Id ||
      parsed.data.Invoice.DocNumber !== number) throw new Error('QBO_INVOICE_UPDATE_UNCERTAIN')
    return parsed.data.Invoice
  }

  async invoiceWithLink(realmId: string, accessToken: string, id: string): Promise<QboInvoice> {
    if (!/^[0-9]{1,80}$/.test(id)) throw new Error('QBO_ENTITY_INVALID')
    const query = encodeURIComponent(`select * from Invoice where Id = '${id}'`)
    const payload = await this.accounting(realmId,accessToken,
      `query?query=${query}&include=invoiceLink`)
    const parsed = z.object({ QueryResponse:z.object({ Invoice:z.array(invoiceSchema.shape.Invoice) }) })
      .safeParse(payload)
    if (!parsed.success || parsed.data.QueryResponse.Invoice.length !== 1 ||
      parsed.data.QueryResponse.Invoice[0].Id !== id)
      throw new Error('QBO_ENTITY_INVALID')
    return parsed.data.QueryResponse.Invoice[0]
  }

  async payment(realmId: string, id: string, accessToken: string): Promise<QboPayment> {
    const result = await this.readEntity(realmId,accessToken,'payment',id,paymentSchema)
    if (result.Payment.Id !== id) throw new Error('QBO_ENTITY_MISMATCH')
    return result.Payment
  }
}
