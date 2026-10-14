import { createClient } from '@supabase/supabase-js'
import { clientEnv } from '@/shared/db/env.client'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { salesQaAllowed } from './qa-gate'

const resources = ['leads', 'contacts', 'accounts', 'opportunities', 'dashboard', 'activities'] as const
export type SalesResource = (typeof resources)[number]
export const isSalesResource = (value: string): value is SalesResource =>
  (resources as readonly string[]).includes(value)

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
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

// Phase C writes use ANNIE's own validation, policy, version checks and audit trail.
// This separate switch is deliberately absent from Production until Lead QA passes.
export type LeadWriteOperation = 'create' | 'edit' | 'transition' | 'archive' | 'convert'

function leadWritePath(operation: LeadWriteOperation, id?: string): string {
  if (operation === 'create') return '/api/crm/leads'
  if (!id || !uuid.test(id)) throw new SalesError(400, 'INVALID_ID')
  if (operation === 'edit') return `/api/crm/leads/${id}`
  return `/api/crm/leads/${id}/${operation === 'transition' ? 'transitions' : operation}`
}

export async function salesLeadWrite(request: Request, operation: LeadWriteOperation, id?: string): Promise<Response> {
  try {
    if (process.env.ANNIE_SALES_QA_WRITE_ENABLED !== 'true') throw new SalesError(403, 'SALES_WRITE_DISABLED')
    const path = leadWritePath(operation, id)
    const expectedMethod = operation === 'edit' ? 'PATCH' : 'POST'
    if (request.method !== expectedMethod) throw new SalesError(405, 'METHOD_NOT_ALLOWED')
    // Keep If-Match on the private ANNIE hop; edge caches may consume it on browser requests.
    const version = request.headers.get('x-annie-expected-version')
    if (operation !== 'create' && (!version || !/^(?:"[1-9]\d*"|[1-9]\d*)$/.test(version)))
      throw new SalesError(428, 'IF_MATCH_REQUIRED')
    const key = request.headers.get('idempotency-key')
    if (operation === 'convert' && (!key || !/^[A-Za-z0-9_-]{8,128}$/.test(key)))
      throw new SalesError(400, 'IDEMPOTENCY_KEY_REQUIRED')
    let payload: unknown
    try { payload = await request.json() } catch { throw new SalesError(400, 'INVALID_JSON') }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new SalesError(400, 'INVALID_BODY')
    const body = JSON.stringify(payload)
    if (Buffer.byteLength(body) > 32768) throw new SalesError(413, 'BODY_TOO_LARGE')
    const { mapping, token } = await mappedActor(request)
    const response = await fetch(new URL(path, origin()), {
      method: expectedMethod, redirect: 'error', cache: 'no-store',
      headers: {
        Cookie: `annie_session=${token}; annie_org=${mapping.annie_organization_id}`,
        Origin: origin(), 'Content-Type': 'application/json', Accept: 'application/json',
        ...(version ? { 'If-Match': version } : {}),
        ...(key ? { 'Idempotency-Key': key } : {}),
      },
      body, signal: AbortSignal.timeout(10000),
    })
    let result: unknown
    try { result = await response.json() } catch { throw new SalesError(502, 'ANNIE_INVALID_RESPONSE') }
    if (response.ok && operation !== 'convert') scopedResult(result, mapping.annie_organization_id)
    return Response.json(result, { status: response.status, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof SalesError ? error : new SalesError(502, 'ANNIE_UNAVAILABLE')
    return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function salesLeadHistory(request: Request, id: string): Promise<Response> {
  try {
    if (!uuid.test(id)) throw new SalesError(400, 'INVALID_ID')
    const query = new URL(request.url).searchParams
    for (const key of Array.from(query.keys())) if (key !== 'limit' && key !== 'cursor') throw new SalesError(400, 'INVALID_FILTER')
    const { mapping, token } = await mappedActor(request)
    const data = await annieGet(`/api/crm/leads/${id}/history`, mapping.annie_organization_id, token, query)
    return Response.json(scopedResult(data, mapping.annie_organization_id), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof SalesError ? error : new SalesError(500, 'SALES_ADAPTER_ERROR')
    return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
  }
}

// Contact writes have their own default-off switch so Lead QA cannot enable them.
export async function salesContactWrite(request: Request, operation: 'create' | 'edit' | 'archive', id?: string): Promise<Response> {
  try {
    if (process.env.ANNIE_SALES_QA_CONTACT_WRITE_ENABLED !== 'true') throw new SalesError(403, 'CONTACT_WRITE_DISABLED')
    if (operation !== 'create' && (!id || !uuid.test(id))) throw new SalesError(400, 'INVALID_ID')
    const method = operation === 'edit' ? 'PATCH' : 'POST'
    if (request.method !== method) throw new SalesError(405, 'METHOD_NOT_ALLOWED')
    const version = request.headers.get('x-annie-expected-version')
    if (operation !== 'create' && (!version || !/^(?:"[1-9]\d*"|[1-9]\d*)$/.test(version)))
      throw new SalesError(428, 'IF_MATCH_REQUIRED')
    let payload: unknown
    try { payload = await request.json() } catch { throw new SalesError(400, 'INVALID_JSON') }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new SalesError(400, 'INVALID_BODY')
    const body = JSON.stringify(payload)
    if (Buffer.byteLength(body) > 32768) throw new SalesError(413, 'BODY_TOO_LARGE')
    const { mapping, token } = await mappedActor(request)
    const path = operation === 'create' ? '/api/crm/contacts' :
      `/api/crm/contacts/${id}${operation === 'archive' ? '/archive' : ''}`
    const response = await fetch(new URL(path, origin()), {
      method, redirect: 'error', cache: 'no-store',
      headers: {
        Cookie: `annie_session=${token}; annie_org=${mapping.annie_organization_id}`,
        Origin: origin(), 'Content-Type': 'application/json', Accept: 'application/json',
        ...(version ? { 'If-Match': version } : {}),
      },
      body, signal: AbortSignal.timeout(10000),
    })
    let result: unknown
    try { result = await response.json() } catch { throw new SalesError(502, 'ANNIE_INVALID_RESPONSE') }
    if (response.ok) scopedResult(result, mapping.annie_organization_id)
    return Response.json(result, { status: response.status, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof SalesError ? error : new SalesError(502, 'ANNIE_UNAVAILABLE')
    return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function salesContactHistory(request: Request, id: string): Promise<Response> {
  try {
    if (!uuid.test(id)) throw new SalesError(400, 'INVALID_ID')
    const query = new URL(request.url).searchParams
    for (const key of Array.from(query.keys())) if (key !== 'limit' && key !== 'cursor') throw new SalesError(400, 'INVALID_FILTER')
    const { mapping, token } = await mappedActor(request)
    const data = await annieGet(`/api/crm/contacts/${id}/history`, mapping.annie_organization_id, token, query)
    return Response.json(scopedResult(data, mapping.annie_organization_id), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof SalesError ? error : new SalesError(500, 'SALES_ADAPTER_ERROR')
    return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
  }
}

// Account QA is isolated from Lead and Contact writes. Production defaults OFF.
// Guard the target on the server as well as in the UI so this switch cannot
// edit or archive a real Account, even with a crafted request.
export async function salesAccountWrite(request: Request, operation: 'create' | 'edit' | 'archive', id?: string): Promise<Response> {
  try {
    if (process.env.ANNIE_SALES_QA_ACCOUNT_WRITE_ENABLED !== 'true') throw new SalesError(403, 'ACCOUNT_WRITE_DISABLED')
    if (operation !== 'create' && (!id || !uuid.test(id))) throw new SalesError(400, 'INVALID_ID')
    const method = operation === 'edit' ? 'PATCH' : 'POST'
    if (request.method !== method) throw new SalesError(405, 'METHOD_NOT_ALLOWED')
    const version = request.headers.get('x-annie-expected-version')
    if (operation !== 'create' && (!version || !/^(?:"[1-9]\d*"|[1-9]\d*)$/.test(version)))
      throw new SalesError(428, 'IF_MATCH_REQUIRED')
    let payload: unknown
    try { payload = await request.json() } catch { throw new SalesError(400, 'INVALID_JSON') }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new SalesError(400, 'INVALID_BODY')
    const body = JSON.stringify(payload)
    if (Buffer.byteLength(body) > 32768) throw new SalesError(413, 'BODY_TOO_LARGE')
    const { mapping, token } = await mappedActor(request)
    if (operation === 'create') {
      const name = (payload as { name?: unknown }).name
      if (typeof name !== 'string' || !name.startsWith('QA PHASE C ')) throw new SalesError(403, 'SYNTHETIC_ACCOUNT_REQUIRED')
    } else {
      const prior = await annieGet(`/api/crm/accounts/${id}`, mapping.annie_organization_id, token) as { data?: { name?: unknown } }
      scopedResult(prior, mapping.annie_organization_id)
      if (typeof prior.data?.name !== 'string' || !prior.data.name.startsWith('QA PHASE C '))
        throw new SalesError(403, 'SYNTHETIC_ACCOUNT_REQUIRED')
      if (operation === 'edit' && Object.hasOwn(payload, 'name') &&
        (typeof (payload as { name?: unknown }).name !== 'string' ||
          !(payload as { name: string }).name.startsWith('QA PHASE C ')))
        throw new SalesError(403, 'SYNTHETIC_ACCOUNT_REQUIRED')
    }
    const path = operation === 'create' ? '/api/crm/accounts' :
      `/api/crm/accounts/${id}${operation === 'archive' ? '/archive' : ''}`
    const response = await fetch(new URL(path, origin()), {
      method, redirect: 'error', cache: 'no-store',
      headers: {
        Cookie: `annie_session=${token}; annie_org=${mapping.annie_organization_id}`,
        Origin: origin(), 'Content-Type': 'application/json', Accept: 'application/json',
        ...(version ? { 'If-Match': version } : {}),
      }, body, signal: AbortSignal.timeout(10000),
    })
    let result: unknown
    try { result = await response.json() } catch { throw new SalesError(502, 'ANNIE_INVALID_RESPONSE') }
    if (response.ok) scopedResult(result, mapping.annie_organization_id)
    return Response.json(result, { status: response.status, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof SalesError ? error : new SalesError(502, 'ANNIE_UNAVAILABLE')
    return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function salesAccountHistory(request: Request, id: string): Promise<Response> {
  try {
    if (!uuid.test(id)) throw new SalesError(400, 'INVALID_ID')
    const query = new URL(request.url).searchParams
    for (const key of Array.from(query.keys())) if (key !== 'limit' && key !== 'cursor') throw new SalesError(400, 'INVALID_FILTER')
    const { mapping, token } = await mappedActor(request)
    const data = await annieGet(`/api/crm/accounts/${id}/history`, mapping.annie_organization_id, token, query)
    return Response.json(scopedResult(data, mapping.annie_organization_id), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof SalesError ? error : new SalesError(500, 'SALES_ADAPTER_ERROR')
    return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function salesContactLeads(request: Request, id: string): Promise<Response> {
  try {
    if (!uuid.test(id)) throw new SalesError(400, 'INVALID_ID')
    const query = new URL(request.url).searchParams
    // ANNIE's contact-origin Lead endpoint accepts cursor only and fixes page size at 50.
    for (const key of Array.from(query.keys())) if (key !== 'cursor') throw new SalesError(400, 'INVALID_FILTER')
    const { mapping, token } = await mappedActor(request)
    const data = await annieGet(`/api/crm/contacts/${id}/leads`, mapping.annie_organization_id, token, query)
    return Response.json(scopedResult(data, mapping.annie_organization_id), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof SalesError ? error : new SalesError(500, 'SALES_ADAPTER_ERROR')
    return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
  }
}

// ANNIE retains AccountContact after clearing a Contact's primaryAccountId.
// Its own versioned link endpoint must deactivate that relationship before
// the Contact can be archived. Keep this under the Contact-only QA switch.
export async function salesContactAccountLinks(request: Request, accountId: string): Promise<Response> {
  try {
    if (!uuid.test(accountId)) throw new SalesError(400, 'INVALID_ID')
    if (new URL(request.url).search) throw new SalesError(400, 'INVALID_FILTER')
    if (request.method === 'GET') {
      const { mapping, token } = await mappedActor(request)
      const data = await annieGet(`/api/crm/accounts/${accountId}/contacts`, mapping.annie_organization_id, token)
      return Response.json(scopedResult(data, mapping.annie_organization_id), { headers: { 'Cache-Control': 'no-store' } })
    }
    if (request.method !== 'POST') throw new SalesError(405, 'METHOD_NOT_ALLOWED')
    if (process.env.ANNIE_SALES_QA_CONTACT_WRITE_ENABLED !== 'true') throw new SalesError(403, 'CONTACT_WRITE_DISABLED')
    const version = request.headers.get('x-annie-expected-version')
    if (!version || !/^(?:"[1-9]\d*"|[1-9]\d*)$/.test(version)) throw new SalesError(428, 'IF_MATCH_REQUIRED')
    let payload: unknown
    try { payload = await request.json() } catch { throw new SalesError(400, 'INVALID_JSON') }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
      Object.keys(payload).length !== 2 ||
      typeof (payload as { contactId?: unknown }).contactId !== 'string' ||
      !uuid.test((payload as { contactId: string }).contactId) ||
      (payload as { active?: unknown }).active !== false)
      throw new SalesError(400, 'INVALID_BODY')
    const { mapping, token } = await mappedActor(request)
    // ANNIE enforces commercial:write, account/contact scope, the primary-link
    // constraint, optimistic versioning, and commercial history.
    const response = await fetch(new URL(`/api/crm/accounts/${accountId}/contacts`, origin()), {
      method: 'POST', redirect: 'error', cache: 'no-store',
      headers: {
        Cookie: `annie_session=${token}; annie_org=${mapping.annie_organization_id}`,
        Origin: origin(), 'Content-Type': 'application/json', Accept: 'application/json',
        'If-Match': version,
      },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
    })
    let result: unknown
    try { result = await response.json() } catch { throw new SalesError(502, 'ANNIE_INVALID_RESPONSE') }
    if (response.ok) scopedResult(result, mapping.annie_organization_id)
    return Response.json(result, { status: response.status, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof SalesError ? error : new SalesError(502, 'ANNIE_UNAVAILABLE')
    return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function salesDirectory(request: Request): Promise<Response> {
  try {
    const { mapping, token } = await mappedActor(request)
    const data = await annieGet('/api/crm/directory', mapping.annie_organization_id, token)
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof SalesError ? error : new SalesError(500, 'SALES_ADAPTER_ERROR')
    return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
  }
}

type Mapping = {
  annie_principal_id: string
  annie_organization_id: string
  empresa_codigo: string | null
  access_kind: 'company_tenant' | 'external_sales_entitlement'
}
async function mappedActor(request: Request): Promise<{ mapping: Mapping; token: string }> {
  const authorization = request.headers.get('authorization') ?? ''
  const supabaseToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!supabaseToken) throw new SalesError(401, 'UNAUTHENTICATED')

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
  const { data: mapping, error: mappingError } = await admin.from('annie_sales_user_mappings')
    .select('annie_principal_id,annie_organization_id,empresa_codigo,access_kind')
    .eq('lilly_usuario_id', profile.id).eq('supabase_auth_id', auth.user.id)
    .eq('status', 'active').maybeSingle()
  if (mappingError || !mapping) throw new SalesError(403, 'USER_MAPPING_REQUIRED')
  if (mapping.access_kind === 'company_tenant') {
    if (!mapping.empresa_codigo) throw new SalesError(403, 'TENANT_MAPPING_REQUIRED')
    const { data: tenant, error: tenantError } = await admin.from('annie_sales_tenant_mappings')
      .select('annie_organization_id').eq('empresa_codigo', mapping.empresa_codigo)
      .eq('annie_organization_id', mapping.annie_organization_id).eq('status', 'active').maybeSingle()
    if (tenantError || !tenant) throw new SalesError(403, 'TENANT_MAPPING_REQUIRED')
  } else if (mapping.access_kind !== 'external_sales_entitlement' || mapping.empresa_codigo !== null) {
    throw new SalesError(403, 'TENANT_MAPPING_REQUIRED')
  }
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
    if (id || resource === 'pipeline' || resource === 'dashboard') {
      if (Array.from(query.keys()).length) throw new SalesError(400, 'INVALID_FILTER')
    } else {
      for (const key of Array.from(query.keys())) if (!listKeys.has(key)) throw new SalesError(400, 'INVALID_FILTER')
    }
    const { mapping, token } = await mappedActor(request)
    const path = resource === 'activities' ? `/api/crm/activities/tasks${id ? `/${id}` : ''}` : `/api/crm/${resource}${id ? `/${id}` : ''}`
    const data = await annieGet(path, mapping.annie_organization_id, token,
      id || resource === 'pipeline' || resource === 'dashboard' ? undefined : query)
    // ANNIE's dashboard aggregates have no per-row organizationId; its policy
    // scopes them to the verified Principal and Organization on the server.
    return Response.json(resource === 'dashboard' ? data : scopedResult(data, mapping.annie_organization_id),
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof SalesError ? error : new SalesError(500, 'SALES_ADAPTER_ERROR')
    return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
  }
}
