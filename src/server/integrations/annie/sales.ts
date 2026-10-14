import { createClient } from '@supabase/supabase-js'
import { clientEnv } from '@/shared/db/env.client'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { salesQaAllowed } from './qa-gate'

const resources = ['leads', 'contacts', 'accounts', 'opportunities'] as const
export type SalesResource = (typeof resources)[number]
export const isSalesResource = (value: string): value is SalesResource =>
  (resources as readonly string[]).includes(value)

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const companyCode = /^[A-Za-z0-9_-]{1,80}$/
const listKeys = new Set([
  'q', 'limit', 'cursor', 'status', 'stageCode', 'type', 'accountId',
  'ownerProfileId', 'teamId', 'archived', 'followUp',
])

class SalesError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code) }
}

function origin(): string {
  const value = process.env.ANNIE_SALES_API_ORIGIN
  if (!value) throw new SalesError(503, 'ANNIE_NOT_CONFIGURED')
  let url: URL
  try { url = new URL(value) } catch { throw new SalesError(503, 'ANNIE_NOT_CONFIGURED') }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new SalesError(503, 'ANNIE_NOT_CONFIGURED')
  return url.origin
}

function sessionToken(principalId: string, organizationId: string): string {
  // Secret-manager supplied, per Principal and Organization. Never sent to the browser.
  // An ANNIE native session is required for the mapped user; a shared service Principal is forbidden.
  let entries: Record<string, unknown>
  try { entries = JSON.parse(process.env.ANNIE_SALES_SESSION_TOKENS_JSON ?? '{}') }
  catch { throw new SalesError(503, 'ANNIE_SESSION_NOT_CONFIGURED') }
  const token = entries[`${principalId}:${organizationId}`]
  if (typeof token !== 'string' || !/^annie_[A-Za-z0-9_-]{40,200}$/.test(token))
    throw new SalesError(503, 'ANNIE_SESSION_NOT_CONFIGURED')
  return token
}

async function annieGet(path: string, organizationId: string, token: string, query?: URLSearchParams): Promise<unknown> {
  const url = new URL(path, origin())
  if (query) url.search = query.toString()
  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET', redirect: 'error', cache: 'no-store',
      // ANNIE's public CRM route is its server proxy. It reads the native
      // session cookies and forwards Bearer/X-Organization-Id internally.
      headers: { Cookie: `annie_session=${token}; annie_org=${organizationId}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
  } catch { throw new SalesError(502, 'ANNIE_UNAVAILABLE') }
  if (response.status === 401 || response.status === 403) throw new SalesError(403, 'ANNIE_ACCESS_DENIED')
  if (response.status === 404) throw new SalesError(404, 'NOT_FOUND')
  if (!response.ok) throw new SalesError(502, 'ANNIE_UPSTREAM_ERROR')
  try { return await response.json() } catch { throw new SalesError(502, 'ANNIE_INVALID_RESPONSE') }
}

type Mapping = { annie_principal_id: string; annie_organization_id: string; empresa_codigo: string }
async function mappedActor(request: Request): Promise<{ mapping: Mapping; token: string }> {
  const authorization = request.headers.get('authorization') ?? ''
  const supabaseToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!supabaseToken) throw new SalesError(401, 'UNAUTHENTICATED')
  const company = request.headers.get('x-lilly-company-code') ?? ''
  if (!companyCode.test(company)) throw new SalesError(400, 'COMPANY_REQUIRED')

  const client = createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${supabaseToken}` } },
  })
  const { data: auth, error: authError } = await client.auth.getUser(supabaseToken)
  if (authError || !auth.user) throw new SalesError(401, 'INVALID_SESSION')
  const { data: profile, error: profileError } = await client.from('usuarios')
    .select('id').eq('auth_id', auth.user.id).eq('activo', true).maybeSingle()
  if (profileError || !profile?.id) throw new SalesError(403, 'ACTIVE_PROFILE_REQUIRED')
  if (!salesQaAllowed(profile.id, auth.user.id)) throw new SalesError(403, 'SALES_QA_DENIED')

  const admin = supabaseAdmin()
  const { data: tenant, error: tenantError } = await admin.from('annie_sales_tenant_mappings')
    .select('empresa_codigo,annie_organization_id').eq('empresa_codigo', company).eq('status', 'active').maybeSingle()
  if (tenantError || !tenant) throw new SalesError(403, 'TENANT_MAPPING_REQUIRED')
  const { data: mapping, error: mappingError } = await admin.from('annie_sales_user_mappings')
    .select('annie_principal_id,annie_organization_id,empresa_codigo')
    .eq('lilly_usuario_id', profile.id).eq('supabase_auth_id', auth.user.id)
    .eq('empresa_codigo', company).eq('annie_organization_id', tenant.annie_organization_id)
    .eq('status', 'active').maybeSingle()
  if (mappingError || !mapping) throw new SalesError(403, 'USER_MAPPING_REQUIRED')
  const token = sessionToken(mapping.annie_principal_id, mapping.annie_organization_id)
  const identity = await annieGet('/api/crm/integration/session/identity', mapping.annie_organization_id, token)
  const data = (identity as { data?: Record<string, unknown> })?.data
  if (data?.principalId !== mapping.annie_principal_id ||
      data?.organizationId !== mapping.annie_organization_id ||
      (data?.capabilities as { salesRead?: boolean } | undefined)?.salesRead !== true)
    throw new SalesError(403, 'ANNIE_IDENTITY_MISMATCH')
  return { mapping, token }
}

function scopedResult(value: unknown, organizationId: string): unknown {
  const body = value as { data?: unknown }
  const rows = Array.isArray(body?.data) ? body.data : [body?.data]
  if (!body || rows.some(row => !row || typeof row !== 'object' ||
    (row as { organizationId?: unknown }).organizationId !== organizationId))
    throw new SalesError(502, 'ANNIE_SCOPE_MISMATCH')
  return value
}

export async function salesRead(request: Request, resource: SalesResource | 'pipeline', id?: string): Promise<Response> {
  try {
    if (id && !uuid.test(id)) throw new SalesError(400, 'INVALID_ID')
    const query = new URL(request.url).searchParams
    if (id || resource === 'pipeline') {
      if (Array.from(query.keys()).length) throw new SalesError(400, 'INVALID_FILTER')
    } else {
      for (const key of Array.from(query.keys())) if (!listKeys.has(key)) throw new SalesError(400, 'INVALID_FILTER')
    }
    const { mapping, token } = await mappedActor(request)
    const path = `/api/crm/${resource}${id ? `/${id}` : ''}`
    const data = await annieGet(path, mapping.annie_organization_id, token, id || resource === 'pipeline' ? undefined : query)
    return Response.json(scopedResult(data, mapping.annie_organization_id), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof SalesError ? error : new SalesError(500, 'SALES_ADAPTER_ERROR')
    return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
  }
}
