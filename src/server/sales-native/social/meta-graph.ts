import 'server-only'
import { z } from 'zod'

const credentials = z.object({
  appId: z.string().min(5).max(200), appSecret: z.string().min(16).max(2000),
  version: z.string().regex(/^v\d{1,2}\.\d{1,2}$/),
  callback: z.literal('https://app.stratixsolutions.us/api/sales-native/social/meta/callback'),
})
export type MetaGraphConfig = z.infer<typeof credentials>
const tokenReply = z.object({ access_token: z.string().min(10).max(16384),
  expires_in: z.number().int().positive().max(60 * 60 * 24 * 365) })
const page = z.object({ id: z.string().min(1).max(200), name: z.string().min(1).max(500),
  access_token: z.string().min(10).max(16384), tasks: z.array(z.string()).optional(),
  instagram_business_account: z.object({ id: z.string().min(1).max(200) }).optional(),
  business: z.object({ id: z.string().min(1).max(200), name: z.string().max(500).optional() }).optional(),
})
const pagesReply = z.object({ data: z.array(page).max(100), paging: z.object({
  next: z.string().optional(), cursors: z.object({ after: z.string().max(500).optional() }).optional(),
}).optional() })
const permissionsReply = z.object({ data: z.array(z.object({
  permission: z.string().min(1).max(200), status: z.string().max(50),
})).max(200) })

export type MetaGraphPage = z.infer<typeof page>
export const META_OAUTH_SCOPES = [
  'pages_show_list', 'pages_manage_metadata', 'leads_retrieval',
] as const

function endpoint(config: MetaGraphConfig, path: string): URL {
  return new URL(`https://graph.facebook.com/${config.version}/${path}`)
}

/** Server-only Graph exchange. No code, token, secret or provider body is logged. */
export class MetaGraphClient {
  private readonly config: MetaGraphConfig
  constructor(config: MetaGraphConfig, private readonly request: typeof fetch = fetch) {
    this.config = credentials.parse(config)
  }

  authorizationUrl(state: string, extraScopes: readonly string[] = []): string {
    if (!/^[A-Za-z0-9_-]{40,100}$/.test(state)) throw new Error('META_STATE_INVALID')
    const supported = new Set<string>([...META_OAUTH_SCOPES,
      'instagram_basic'])
    if (extraScopes.some(scope => !supported.has(scope))) throw new Error('META_SCOPE_INVALID')
    const url = new URL('https://www.facebook.com/dialog/oauth')
    url.searchParams.set('client_id', this.config.appId)
    url.searchParams.set('redirect_uri', this.config.callback)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('state', state)
    url.searchParams.set('scope', Array.from(new Set<string>([...META_OAUTH_SCOPES, ...extraScopes])).join(','))
    return url.toString()
  }

  async exchange(code: string): Promise<{ token: string; expiresAt: Date }> {
    if (!code || code.length > 4096) throw new Error('META_CODE_INVALID')
    const url = endpoint(this.config, 'oauth/access_token')
    const call = async (body: URLSearchParams) => {
      let response: Response
      try { response = await this.request(url, { method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
        cache: 'no-store', signal: AbortSignal.timeout(10_000) }) }
      catch { throw new Error('META_PROVIDER_UNAVAILABLE') }
      if (!response.ok) throw new Error('META_PROVIDER_UNAVAILABLE')
      let decoded: unknown
      try { decoded = await response.json() }
      catch { throw new Error('META_EXCHANGE_INVALID') }
      const parsed = tokenReply.safeParse(decoded)
      if (!parsed.success) throw new Error('META_EXCHANGE_INVALID')
      return parsed.data
    }
    const short = await call(new URLSearchParams({ client_id: this.config.appId,
      client_secret: this.config.appSecret, redirect_uri: this.config.callback, code }))
    return this.refreshUserToken(short.access_token)
  }

  async refreshUserToken(userToken: string): Promise<{ token: string; expiresAt: Date }> {
    if (!userToken || userToken.length > 16384) throw new Error('META_TOKEN_UNAVAILABLE')
    const url = endpoint(this.config, 'oauth/access_token')
    let response: Response
    try { response = await this.request(url, { method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'fb_exchange_token',
        client_id: this.config.appId, client_secret: this.config.appSecret,
        fb_exchange_token: userToken }),
      cache: 'no-store', signal: AbortSignal.timeout(10_000) }) }
    catch { throw new Error('META_PROVIDER_UNAVAILABLE') }
    if (!response.ok) throw new Error('META_PROVIDER_UNAVAILABLE')
    let decoded: unknown
    try { decoded = await response.json() }
    catch { throw new Error('META_EXCHANGE_INVALID') }
    const parsed = tokenReply.safeParse(decoded)
    if (!parsed.success) throw new Error('META_EXCHANGE_INVALID')
    return { token: parsed.data.access_token,
      expiresAt: new Date(Date.now() + parsed.data.expires_in * 1000) }
  }

  async discoverPages(userToken: string): Promise<MetaGraphPage[]> {
    if (!userToken) throw new Error('META_TOKEN_UNAVAILABLE')
    const collect = async (fields: string) => {
      const result: MetaGraphPage[] = []; let after: string | undefined
      for (let index = 0; index < 10; index++) {
        const url = endpoint(this.config, 'me/accounts')
        url.searchParams.set('fields', fields)
        url.searchParams.set('limit', '100')
        if (after) url.searchParams.set('after', after)
        let response: Response
        try { response = await this.request(url, { headers: { Authorization: `Bearer ${userToken}` },
          cache: 'no-store', signal: AbortSignal.timeout(10_000) }) }
        catch { throw new Error('META_PROVIDER_UNAVAILABLE') }
        if (response.status === 400 && fields.includes('business{'))
          throw new Error('META_BUSINESS_FIELD_UNAVAILABLE')
        if (!response.ok) throw new Error('META_PROVIDER_UNAVAILABLE')
        let decoded: unknown
        try { decoded = await response.json() }
        catch { throw new Error('META_PAGES_INVALID') }
        const parsed = pagesReply.safeParse(decoded)
        if (!parsed.success) throw new Error('META_PAGES_INVALID')
        result.push(...parsed.data.data)
        if (!parsed.data.paging?.next) return result
        after = parsed.data.paging.cursors?.after
        if (!after) throw new Error('META_PAGES_INCOMPLETE')
      }
      throw new Error('META_PAGES_INCOMPLETE')
    }
    try { return await collect('id,name,access_token,tasks,instagram_business_account,business{id,name}') }
    catch (error) {
      if (!(error instanceof Error) || error.message !== 'META_BUSINESS_FIELD_UNAVAILABLE') throw error
      return collect('id,name,access_token,tasks,instagram_business_account')
    }
  }

  async grantedPermissions(userToken: string): Promise<string[]> {
    if (!userToken) throw new Error('META_TOKEN_UNAVAILABLE')
    const url = endpoint(this.config, 'me/permissions')
    let response: Response
    try { response = await this.request(url, { headers: { Authorization: `Bearer ${userToken}` },
      cache: 'no-store', signal: AbortSignal.timeout(10_000) }) }
    catch { throw new Error('META_PROVIDER_UNAVAILABLE') }
    if (!response.ok) throw new Error('META_PROVIDER_UNAVAILABLE')
    let decoded: unknown
    try { decoded = await response.json() }
    catch { throw new Error('META_PERMISSIONS_INVALID') }
    const parsed = permissionsReply.safeParse(decoded)
    if (!parsed.success) throw new Error('META_PERMISSIONS_INVALID')
    return parsed.data.data.filter(row => row.status === 'granted').map(row => row.permission)
  }

  async subscribePage(pageId: string, pageToken: string, fields: readonly string[]): Promise<void> {
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(pageId) || !pageToken || !fields.length ||
      fields.some(field => field !== 'leadgen'))
      throw new Error('META_SUBSCRIPTION_INVALID')
    const url = endpoint(this.config, `${encodeURIComponent(pageId)}/subscribed_apps`)
    let response: Response
    try { response = await this.request(url, { method: 'POST',
      headers: { Authorization: `Bearer ${pageToken}`,
        'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ subscribed_fields: Array.from(new Set(fields)).join(',') }),
      cache: 'no-store', signal: AbortSignal.timeout(10_000) }) }
    catch { throw new Error('META_SUBSCRIPTION_FAILED') }
    if (!response.ok) throw new Error('META_SUBSCRIPTION_FAILED')
    let decoded: unknown
    try { decoded = await response.json() }
    catch { throw new Error('META_SUBSCRIPTION_FAILED') }
    if (!z.object({ success: z.literal(true) }).safeParse(decoded).success)
      throw new Error('META_SUBSCRIPTION_FAILED')
  }
}
