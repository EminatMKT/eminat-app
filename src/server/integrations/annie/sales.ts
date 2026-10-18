import { createClient } from '@supabase/supabase-js'
import { createHmac, randomUUID } from 'node:crypto'
import { clientEnv } from '@/shared/db/env.client'
import { salesEntitlement, type SalesMapping } from './sales-entitlement'

const resources = ['leads', 'contacts', 'accounts', 'opportunities', 'dashboard', 'activities'] as const
export type SalesResource = (typeof resources)[number]
export const isSalesResource = (value: string): value is SalesResource =>
  (resources as readonly string[]).includes(value)

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const listKeys = new Set([
  'q', 'limit', 'cursor', 'status', 'stageCode', 'type', 'accountId',
  'ownerProfileId', 'teamId', 'archived', 'followUp',
])
const activityKeys = new Set(['view', 'leadId', 'timezone', 'limit'])
const extendedQueryKeys = new Set([
  'search', 'page', 'status', 'demo', 'plan', 'modality', 'duration',
  'sellerProfileId', 'issuedFrom', 'issuedTo', 'expiresFrom', 'expiresTo',
  'saleFrom', 'saleTo', 'from', 'to', 'timezone', 'ownerProfileId', 'teamId', 'membershipType',
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
  // Mint a new, short-lived assertion for every server request. The shared key
  // stays in LILLY's server environment; ANNIE still resolves the current role,
  // active membership and record scope from its own database.
  const encoded = process.env.ANNIE_SALES_TRUST_KEY ?? ''
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) throw new SalesError(503, 'ANNIE_TRUST_NOT_CONFIGURED')
  const key = Buffer.from(encoded, 'base64url')
  if (key.length < 32 || key.toString('base64url') !== encoded)
    throw new SalesError(503, 'ANNIE_TRUST_NOT_CONFIGURED')
  if (!uuid.test(principalId) || !uuid.test(organizationId)) throw new SalesError(403, 'USER_MAPPING_REQUIRED')
  const issuedAt = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iss: 'lilly-sales', aud: 'annie-sales', sub: principalId,
    org: organizationId, purpose: 'sales', iat: issuedAt, exp: issuedAt + 30, jti: randomUUID() })).toString('base64url')
  const input = `${header}.${payload}`
  const signature = createHmac('sha256', key).update(input).digest('base64url')
  return `${input}.${signature}`
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
    const proposed = payload as Record<string, unknown>
    if (operation === 'create') {
      if (typeof proposed.displayName !== 'string' || !proposed.displayName.startsWith('QA PHASE C '))
        throw new SalesError(403, 'SYNTHETIC_LEAD_REQUIRED')
    } else {
      const prior = scopedResult(await annieGet(`/api/crm/leads/${id}`, mapping.annie_organization_id, token),
        mapping.annie_organization_id) as { data?: { displayName?: unknown } }
      if (typeof prior.data?.displayName !== 'string' || !prior.data.displayName.startsWith('QA PHASE C '))
        throw new SalesError(403, 'SYNTHETIC_LEAD_REQUIRED')
      if (operation === 'edit' && Object.hasOwn(proposed, 'displayName') &&
          (typeof proposed.displayName !== 'string' || !proposed.displayName.startsWith('QA PHASE C ')))
        throw new SalesError(403, 'SYNTHETIC_LEAD_REQUIRED')
      if (operation === 'convert') {
        if (proposed.accountId || proposed.contactId || typeof proposed.accountName !== 'string' ||
            !proposed.accountName.startsWith('QA PHASE C '))
          throw new SalesError(403, 'SYNTHETIC_CONVERSION_REQUIRED')
        const opportunity = proposed.opportunity as { name?: unknown } | undefined
        if (opportunity && (typeof opportunity.name !== 'string' || !opportunity.name.startsWith('QA PHASE C ')))
          throw new SalesError(403, 'SYNTHETIC_CONVERSION_REQUIRED')
      }
    }
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
    const proposed = payload as Record<string, unknown>
    if (operation === 'create') {
      if (typeof proposed.displayName !== 'string' || !proposed.displayName.startsWith('QA PHASE C '))
        throw new SalesError(403, 'SYNTHETIC_CONTACT_REQUIRED')
    } else {
      const prior = scopedResult(await annieGet(`/api/crm/contacts/${id}`, mapping.annie_organization_id, token),
        mapping.annie_organization_id) as { data?: { displayName?: unknown } }
      if (typeof prior.data?.displayName !== 'string' || !prior.data.displayName.startsWith('QA PHASE C '))
        throw new SalesError(403, 'SYNTHETIC_CONTACT_REQUIRED')
      if (operation === 'edit' && Object.hasOwn(proposed, 'displayName') &&
          (typeof proposed.displayName !== 'string' || !proposed.displayName.startsWith('QA PHASE C ')))
        throw new SalesError(403, 'SYNTHETIC_CONTACT_REQUIRED')
    }
    if (proposed.primaryAccountId) {
      if (typeof proposed.primaryAccountId !== 'string' || !uuid.test(proposed.primaryAccountId))
        throw new SalesError(400, 'INVALID_ACCOUNT_ID')
      const account = scopedResult(await annieGet(`/api/crm/accounts/${proposed.primaryAccountId}`,
        mapping.annie_organization_id, token), mapping.annie_organization_id) as { data?: { name?: unknown } }
      if (typeof account.data?.name !== 'string' || !account.data.name.startsWith('QA PHASE C '))
        throw new SalesError(403, 'SYNTHETIC_ACCOUNT_REQUIRED')
    }
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

// Opportunity QA has its own default-OFF switch and accepts writes only to
// records explicitly named as Phase C synthetic data.
export async function salesOpportunityWrite(request: Request, operation: 'create' | 'edit' | 'transition' | 'archive', id?: string): Promise<Response> {
  try {
    if (process.env.ANNIE_SALES_QA_OPPORTUNITY_WRITE_ENABLED !== 'true') throw new SalesError(403, 'OPPORTUNITY_WRITE_DISABLED')
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
      if (typeof name !== 'string' || !name.startsWith('QA PHASE C ')) throw new SalesError(403, 'SYNTHETIC_OPPORTUNITY_REQUIRED')
    } else {
      const prior = await annieGet(`/api/crm/opportunities/${id}`, mapping.annie_organization_id, token) as { data?: { name?: unknown } }
      scopedResult(prior, mapping.annie_organization_id)
      if (typeof prior.data?.name !== 'string' || !prior.data.name.startsWith('QA PHASE C '))
        throw new SalesError(403, 'SYNTHETIC_OPPORTUNITY_REQUIRED')
      if (operation === 'edit' && Object.hasOwn(payload, 'name') &&
        (typeof (payload as { name?: unknown }).name !== 'string' ||
          !(payload as { name: string }).name.startsWith('QA PHASE C ')))
        throw new SalesError(403, 'SYNTHETIC_OPPORTUNITY_REQUIRED')
    }
    const relation = payload as { accountId?: unknown; primaryContactId?: unknown }
    for (const [resource, value, nameKey] of [
      ['accounts', relation.accountId, 'name'], ['contacts', relation.primaryContactId, 'displayName'],
    ] as const) {
      if (value === undefined || value === null || value === '') continue
      if (typeof value !== 'string' || !uuid.test(value)) throw new SalesError(400, 'INVALID_RELATION_ID')
      const related = scopedResult(await annieGet(`/api/crm/${resource}/${value}`,
        mapping.annie_organization_id, token), mapping.annie_organization_id) as { data?: Record<string, unknown> }
      const name = related.data?.[nameKey]
      if (typeof name !== 'string' || !name.startsWith('QA PHASE C '))
        throw new SalesError(403, 'SYNTHETIC_RELATION_REQUIRED')
    }
    const path = operation === 'create' ? '/api/crm/opportunities' :
      `/api/crm/opportunities/${id}${operation === 'edit' ? '' : operation === 'transition' ? '/transitions' : '/archive'}`
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

export async function salesOpportunityRelated(request: Request, id: string, related: 'history' | 'contacts'): Promise<Response> {
  try {
    if (!uuid.test(id)) throw new SalesError(400, 'INVALID_ID')
    const query = new URL(request.url).searchParams
    for (const key of Array.from(query.keys())) if (related !== 'history' || (key !== 'limit' && key !== 'cursor')) throw new SalesError(400, 'INVALID_FILTER')
    const { mapping, token } = await mappedActor(request)
    const data = await annieGet(`/api/crm/opportunities/${id}/${related}`, mapping.annie_organization_id, token, query)
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
    const account = scopedResult(await annieGet(`/api/crm/accounts/${accountId}`,
      mapping.annie_organization_id, token), mapping.annie_organization_id) as { data?: { name?: unknown } }
    const contactId = (payload as { contactId: string }).contactId
    const contact = scopedResult(await annieGet(`/api/crm/contacts/${contactId}`,
      mapping.annie_organization_id, token), mapping.annie_organization_id) as { data?: { displayName?: unknown } }
    if (typeof account.data?.name !== 'string' || !account.data.name.startsWith('QA PHASE C ') ||
        typeof contact.data?.displayName !== 'string' || !contact.data.displayName.startsWith('QA PHASE C '))
      throw new SalesError(403, 'SYNTHETIC_RELATION_REQUIRED')
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

type SalesIdentity = {
  role?: string
  capabilities?: { salesRead?: boolean; salesWrite?: boolean; salesReassign?: boolean; salesAuditRead?: boolean }
}

async function mappedActor(request: Request): Promise<{ mapping: SalesMapping; token: string; identity: SalesIdentity }> {
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
  const mapping = await salesEntitlement(profile.id, auth.user.id)
  if (!mapping) throw new SalesError(403, 'USER_MAPPING_REQUIRED')
  const token = sessionToken(mapping.annie_principal_id, mapping.annie_organization_id)
  const identity = await annieGet('/api/crm/integration/session/identity', mapping.annie_organization_id, token)
  const data = (identity as { data?: Record<string, unknown> })?.data
  if (data?.principalId !== mapping.annie_principal_id ||
      data?.organizationId !== mapping.annie_organization_id ||
      (data?.capabilities as { salesRead?: boolean } | undefined)?.salesRead !== true)
    throw new SalesError(403, 'ANNIE_IDENTITY_MISMATCH')
  return { mapping, token, identity: data as SalesIdentity }
}

export async function salesAccess(request: Request): Promise<boolean> {
  try { await mappedActor(request); return true }
  catch (error) {
    console.warn('SALES_ACCESS_DENIED', error instanceof SalesError ? error.code : 'UNEXPECTED_ERROR')
    return false
  }
}

export async function salesAccessDetails(request: Request): Promise<{
  allowed: boolean; role?: string; canWrite: boolean; canReassign: boolean; canReadAudit: boolean
}> {
  try {
    const { identity } = await mappedActor(request)
    const role = identity.role
    if (!role || !['SUPERADMIN', 'ADMINISTRATOR', 'SALES_MANAGER', 'OPERATOR', 'AUDITOR'].includes(role))
      return { allowed: false, canWrite: false, canReassign: false, canReadAudit: false }
    return { allowed: true, role, canWrite: identity.capabilities?.salesWrite === true,
      canReassign: identity.capabilities?.salesReassign === true,
      canReadAudit: identity.capabilities?.salesAuditRead === true }
  } catch (error) {
    console.warn('SALES_ACCESS_DENIED', error instanceof SalesError ? error.code : 'UNEXPECTED_ERROR')
    return { allowed: false, canWrite: false, canReassign: false, canReadAudit: false }
  }
}

function scopedResult(value: unknown, organizationId: string): unknown {
  const body = value as { data?: unknown }
  const rows = Array.isArray(body?.data) ? body.data : [body?.data]
  if (!body || rows.some(row => !row || typeof row !== 'object' ||
    (row as { organizationId?: unknown }).organizationId !== organizationId))
    throw new SalesError(502, 'ANNIE_SCOPE_MISMATCH')
  return value
}

function extendedPath(parts: string[]): { path: string; pdf: boolean; scoped: boolean } {
  const [section, action, idAction] = parts
  if (section === 'memberships') {
    if (parts.length === 1) return { path: '/api/crm/program-memberships', pdf: false, scoped: true }
    if (parts.length === 2 && ['catalog', 'dashboard', 'reports'].includes(action))
      return { path: `/api/crm/program-memberships/${action}`, pdf: false, scoped: false }
    if (parts.length === 2 && uuid.test(action))
      return { path: `/api/crm/program-memberships/${action}`, pdf: false, scoped: true }
    if (parts.length === 3 && uuid.test(action) && ['pdf', 'agreement'].includes(idAction))
      return { path: `/api/crm/program-memberships/${action}/${idAction}`, pdf: true, scoped: false }
  }
  if (section === 'reports' && parts.length === 1)
    return { path: '/api/crm/reports', pdf: false, scoped: false }
  if (section === 'reports' && parts.length === 2 && action === 'schedule')
    return { path: '/api/crm/reports/schedule', pdf: false, scoped: false }
  if (section === 'sales-dashboard' && parts.length === 1)
    return { path: '/api/crm/sales-dashboard', pdf: false, scoped: false }
  if (section === 'lead-lifecycle' && parts.length === 1)
    return { path: '/api/crm/lead-lifecycle', pdf: false, scoped: false }
  if (section === 'social' && parts.length === 2 && action === 'providers')
    return { path: '/api/crm/social/providers', pdf: false, scoped: false }
  if (section === 'social' && parts.length === 3 && action === 'meta' &&
      ['integrations', 'accounts', 'assets'].includes(idAction))
    return { path: `/api/crm/social/meta/${idAction}`, pdf: false, scoped: false }
  if (section === 'meta' && parts.length === 2 &&
      ['status', 'connections', 'conversations', 'links'].includes(action))
    return { path: `/api/crm/meta/${action}`, pdf: false, scoped: false }
  if (section === 'meta' && parts.length === 4 && action === 'conversations' &&
      uuid.test(idAction) && parts[3] === 'events')
    return { path: `/api/crm/meta/conversations/${idAction}/events`, pdf: false, scoped: false }
  throw new SalesError(404, 'NOT_FOUND')
}

export async function salesExtendedRead(request: Request, parts: string[]): Promise<Response> {
  try {
    if (request.method !== 'GET') throw new SalesError(405, 'METHOD_NOT_ALLOWED')
    const target = extendedPath(parts)
    const query = new URL(request.url).searchParams
    if (query.toString().length > 2048 || Array.from(query.keys()).some(key => !extendedQueryKeys.has(key)))
      throw new SalesError(400, 'INVALID_FILTER')
    if (target.pdf && query.size) throw new SalesError(400, 'INVALID_FILTER')
    const { mapping, token } = await mappedActor(request)
    const url = new URL(target.path, origin())
    url.search = query.toString()
    let upstream: Response
    try {
      upstream = await fetch(url, { method: 'GET', redirect: 'error', cache: 'no-store',
        headers: { Cookie: `annie_session=${token}; annie_org=${mapping.annie_organization_id}`,
          Accept: target.pdf ? 'application/pdf' : 'application/json' },
        signal: AbortSignal.timeout(10000) })
    } catch { throw new SalesError(502, 'ANNIE_UNAVAILABLE') }
    if (upstream.status === 401 || upstream.status === 403) throw new SalesError(403, 'ANNIE_ACCESS_DENIED')
    if (upstream.status === 404) throw new SalesError(404, 'NOT_FOUND')
    if (!upstream.ok) throw new SalesError(502, 'ANNIE_UPSTREAM_ERROR')
    if (target.pdf) {
      if (!upstream.headers.get('content-type')?.startsWith('application/pdf'))
        throw new SalesError(502, 'ANNIE_INVALID_RESPONSE')
      const bytes = await upstream.arrayBuffer()
      if (bytes.byteLength > 5_000_000) throw new SalesError(502, 'ANNIE_INVALID_RESPONSE')
      return new Response(bytes, { headers: { 'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
    }
    let result: unknown
    try { result = await upstream.json() } catch { throw new SalesError(502, 'ANNIE_INVALID_RESPONSE') }
    if (target.scoped) scopedResult(result, mapping.annie_organization_id)
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof SalesError ? error : new SalesError(500, 'SALES_ADAPTER_ERROR')
    return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
  }
}

// ANNIE owns parsing, duplicate detection, tenant assignment and processing.
// LILLY only forwards a bounded, explicit import workflow for the mapped actor.
export async function salesImportRequest(request: Request, parts: string[]): Promise<Response> {
  try {
    const [id, action] = parts
    const upload = parts.length === 0 && request.method === 'POST'
    const detail = parts.length === 1 && uuid.test(id) && request.method === 'GET'
    const errors = parts.length === 2 && uuid.test(id) && action === 'errors' && request.method === 'GET'
    const command = parts.length === 2 && uuid.test(id) &&
      ['preview', 'start', 'cancel'].includes(action) && request.method === 'POST'
    if (!upload && !detail && !errors && !command) throw new SalesError(404, 'NOT_FOUND')
    if ((upload || command) && process.env.ANNIE_SALES_IMPORT_ENABLED !== 'true')
      throw new SalesError(403, 'IMPORT_DISABLED')
    const query = new URL(request.url).searchParams
    if (query.toString().length > 300 || Array.from(query.keys()).some(key => !detail || key !== 'sheet'))
      throw new SalesError(400, 'INVALID_FILTER')
    const { mapping, token } = await mappedActor(request)
    let body: FormData | string | undefined
    if (upload) {
      const length = Number(request.headers.get('content-length') ?? 0)
      if (length > 11_000_000) throw new SalesError(413, 'BODY_TOO_LARGE')
      const incoming = await request.formData()
      const file = incoming.get('file')
      const destination = incoming.get('destination')
      if (!(file instanceof File) || file.size === 0 || file.size > 10_000_000 ||
          !/\.(csv|xlsx)$/i.test(file.name) || !['LEAD', 'CONTACT'].includes(String(destination)))
        throw new SalesError(400, 'INVALID_IMPORT_FILE')
      const key = request.headers.get('idempotency-key')
      if (!key || !uuid.test(key)) throw new SalesError(400, 'IDEMPOTENCY_KEY_REQUIRED')
      const form = new FormData()
      form.set('file', file, file.name)
      form.set('destination', String(destination))
      body = form
    } else if (command && action === 'preview') {
      const raw = await request.text()
      if (Buffer.byteLength(raw) > 32_768) throw new SalesError(413, 'BODY_TOO_LARGE')
      let parsed: unknown
      try { parsed = JSON.parse(raw) } catch { throw new SalesError(400, 'INVALID_JSON') }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
          Object.keys(parsed).some(key => !['sheetName', 'mapping', 'duplicateMode', 'ownerProfileId', 'teamId', 'defaultSource'].includes(key)))
        throw new SalesError(400, 'INVALID_IMPORT_PREVIEW')
      body = raw
    } else if (command) body = '{}'
    const url = new URL(`/api/crm/import-jobs${parts.length ? `/${parts.join('/')}` : ''}`, origin())
    url.search = query.toString()
    let upstream: Response
    try {
      upstream = await fetch(url, { method: request.method, redirect: 'error', cache: 'no-store',
        headers: { Cookie: `annie_session=${token}; annie_org=${mapping.annie_organization_id}`,
          Accept: 'application/json', ...(request.method === 'POST' ? { Origin: origin() } : {}),
          ...(typeof body === 'string' ? { 'Content-Type': 'application/json' } : {}),
          ...(upload ? { 'Idempotency-Key': request.headers.get('idempotency-key')! } : {}) },
        body, signal: AbortSignal.timeout(upload ? 60_000 : 15_000) })
    } catch { throw new SalesError(502, 'ANNIE_UNAVAILABLE') }
    if (upstream.status === 401 || upstream.status === 403) throw new SalesError(403, 'ANNIE_ACCESS_DENIED')
    let result: unknown
    try { result = await upstream.json() } catch { throw new SalesError(502, 'ANNIE_INVALID_RESPONSE') }
    if (!upstream.ok) {
      const code = (result as { code?: unknown })?.code
      throw new SalesError(upstream.status, typeof code === 'string' && /^[A-Z0-9_]{2,80}$/.test(code) ? code : 'ANNIE_IMPORT_FAILED')
    }
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof SalesError ? error : new SalesError(502, 'ANNIE_UNAVAILABLE')
    return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
  }
}

const interactionResources = new Set(['leads', 'contacts', 'accounts', 'opportunities'])
export async function salesRecordInteractions(request: Request, resource: string, id: string): Promise<Response> {
  try {
    if (!interactionResources.has(resource) || !uuid.test(id)) throw new SalesError(404, 'NOT_FOUND')
    if (request.method !== 'GET' && request.method !== 'POST') throw new SalesError(405, 'METHOD_NOT_ALLOWED')
    if (new URL(request.url).search) throw new SalesError(400, 'INVALID_FILTER')
    if (request.method === 'POST' && process.env.ANNIE_SALES_QA_INTERACTION_ENABLED !== 'true')
      throw new SalesError(403, 'INTERACTION_WRITE_DISABLED')
    const { mapping, token } = await mappedActor(request)
    let body: string | undefined
    if (request.method === 'POST') {
      const detail = scopedResult(await annieGet(`/api/crm/${resource}/${id}`, mapping.annie_organization_id, token),
        mapping.annie_organization_id) as { data?: { displayName?: string; name?: string; access?: { canEdit?: boolean } } }
      if (detail.data?.access?.canEdit !== true ||
          !(detail.data.displayName ?? detail.data.name ?? '').startsWith('QA PHASE C '))
        throw new SalesError(403, 'SYNTHETIC_RECORD_REQUIRED')
      let payload: unknown
      try { payload = await request.json() } catch { throw new SalesError(400, 'INVALID_JSON') }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new SalesError(400, 'INVALID_BODY')
      const value = payload as Record<string, unknown>
      if (Object.keys(value).some(key => !['kind', 'occurredAt', 'body', 'durationMinutes'].includes(key)) ||
          !['note', 'call', 'call_no_answer', 'email_manual', 'whatsapp'].includes(String(value.kind)) ||
          typeof value.body !== 'string' || !value.body.trim() || value.body.length > 10_000 ||
          typeof value.occurredAt !== 'string' || Number.isNaN(Date.parse(value.occurredAt)))
        throw new SalesError(400, 'INVALID_INTERACTION')
      body = JSON.stringify(value)
    }
    let response: Response
    try {
      response = await fetch(new URL(`/api/crm/${resource}/${id}/interactions`, origin()), {
        method: request.method, redirect: 'error', cache: 'no-store',
        headers: { Cookie: `annie_session=${token}; annie_org=${mapping.annie_organization_id}`,
          Accept: 'application/json', ...(body ? { Origin: origin(), 'Content-Type': 'application/json' } : {}) },
        body, signal: AbortSignal.timeout(10_000),
      })
    } catch { throw new SalesError(502, 'ANNIE_UNAVAILABLE') }
    if (response.status === 401 || response.status === 403) throw new SalesError(403, 'ANNIE_ACCESS_DENIED')
    let result: unknown
    try { result = await response.json() } catch { throw new SalesError(502, 'ANNIE_INVALID_RESPONSE') }
    if (!response.ok) {
      const code = (result as { code?: unknown })?.code
      throw new SalesError(response.status, typeof code === 'string' && /^[A-Z0-9_]{2,80}$/.test(code) ? code : 'ANNIE_REQUEST_FAILED')
    }
    scopedResult(result, mapping.annie_organization_id)
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof SalesError ? error : new SalesError(502, 'ANNIE_UNAVAILABLE')
    return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
  }
}

const qaRecipient = 'freddy@stratix360.com'
export async function salesIndividualEmail(request: Request, operation: 'list' | 'create' | 'queue', messageId?: string): Promise<Response> {
  try {
    if (operation === 'list' ? request.method !== 'GET' : request.method !== 'POST')
      throw new SalesError(405, 'METHOD_NOT_ALLOWED')
    const query = new URL(request.url).searchParams
    let payload: Record<string, unknown> | undefined
    if (operation === 'list') {
      if (Array.from(query.keys()).some(key => !['subjectType', 'subjectId'].includes(key)) ||
          !['leads', 'contacts'].includes(query.get('subjectType') ?? '') || !uuid.test(query.get('subjectId') ?? ''))
        throw new SalesError(400, 'INVALID_FILTER')
    } else {
      if (query.size || process.env.ANNIE_SALES_QA_EMAIL_ENABLED !== 'true')
        throw new SalesError(403, 'EMAIL_DISABLED')
      try { payload = await request.json() as Record<string, unknown> } catch { throw new SalesError(400, 'INVALID_JSON') }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
          !['leads', 'contacts'].includes(String(payload.subjectType)) || !uuid.test(String(payload.subjectId)))
        throw new SalesError(400, 'INVALID_EMAIL')
      if (operation === 'create' && (Object.keys(payload).some(key =>
        !['subjectType', 'subjectId', 'recipient', 'subject', 'bodyText'].includes(key)) ||
          payload.recipient !== qaRecipient || typeof payload.subject !== 'string' ||
          !payload.subject.trim() || payload.subject.length > 500 ||
          typeof payload.bodyText !== 'string' || !payload.bodyText.trim() || payload.bodyText.length > 50_000))
        throw new SalesError(400, 'INVALID_EMAIL')
      if (operation === 'queue' && (Object.keys(payload).some(key =>
        !['subjectType', 'subjectId'].includes(key)) || !messageId || !uuid.test(messageId)))
        throw new SalesError(400, 'INVALID_EMAIL')
    }
    const { mapping, token } = await mappedActor(request)
    const subjectType = operation === 'list' ? query.get('subjectType')! : String(payload!.subjectType)
    const subjectId = operation === 'list' ? query.get('subjectId')! : String(payload!.subjectId)
    const subject = scopedResult(await annieGet(`/api/crm/${subjectType}/${subjectId}`,
      mapping.annie_organization_id, token), mapping.annie_organization_id) as { data?: {
        displayName?: string; email?: string; doNotEmail?: boolean; access?: { canEdit?: boolean }
      } }
    if (operation !== 'list' && (subject.data?.access?.canEdit !== true ||
        !subject.data.displayName?.startsWith('QA PHASE C ') ||
        subject.data.email?.toLowerCase() !== qaRecipient || subject.data.doNotEmail === true))
      throw new SalesError(403, 'SYNTHETIC_EMAIL_SUBJECT_REQUIRED')
    const messageQuery = new URLSearchParams({ subjectType, subjectId })
    if (operation === 'list' || operation === 'queue') {
      const existing = scopedResult(await annieGet('/api/crm/communications/messages',
        mapping.annie_organization_id, token, messageQuery), mapping.annie_organization_id) as {
        data?: { id: string; purpose: string; recipient: string; version: number }[]
      }
      if (operation === 'list') return Response.json(existing, { headers: { 'Cache-Control': 'no-store' } })
      const target = existing.data?.find(row => row.id === messageId)
      if (!target || target.purpose !== 'individual' || target.recipient.toLowerCase() !== qaRecipient ||
          !Number.isInteger(target.version) || target.version < 1)
        throw new SalesError(403, 'QA_MESSAGE_REQUIRED')
      payload = { version: target.version }
    }
    const path = operation === 'create' ? '/api/crm/communications/messages/individual' :
      `/api/crm/communications/messages/${messageId}/queue`
    const key = request.headers.get('idempotency-key')
    if (operation === 'create' && (!key || !uuid.test(key))) throw new SalesError(400, 'IDEMPOTENCY_KEY_REQUIRED')
    let upstream: Response
    try {
      upstream = await fetch(new URL(path, origin()), { method: 'POST', redirect: 'error', cache: 'no-store',
        headers: { Cookie: `annie_session=${token}; annie_org=${mapping.annie_organization_id}`,
          Origin: origin(), 'Content-Type': 'application/json', Accept: 'application/json',
          ...(operation === 'create' ? { 'Idempotency-Key': key! } : { 'If-Match': String(payload!.version) }) },
        body: operation === 'create' ? JSON.stringify({ ...payload, channel: 'email', cc: [], bcc: [] }) : '{}',
        signal: AbortSignal.timeout(10_000) })
    } catch { throw new SalesError(502, 'ANNIE_UNAVAILABLE') }
    if (upstream.status === 401 || upstream.status === 403) throw new SalesError(403, 'ANNIE_ACCESS_DENIED')
    let result: unknown
    try { result = await upstream.json() } catch { throw new SalesError(502, 'ANNIE_INVALID_RESPONSE') }
    if (!upstream.ok) {
      const code = (result as { code?: unknown })?.code
      throw new SalesError(upstream.status, typeof code === 'string' && /^[A-Z0-9_]{2,80}$/.test(code) ? code : 'ANNIE_REQUEST_FAILED')
    }
    scopedResult(result, mapping.annie_organization_id)
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof SalesError ? error : new SalesError(502, 'ANNIE_UNAVAILABLE')
    return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function salesActivityWrite(request: Request, operation: 'create' | 'edit', id?: string): Promise<Response> {
  try {
    if (process.env.ANNIE_SALES_QA_ACTIVITY_ENABLED !== 'true') throw new SalesError(403, 'ACTIVITY_WRITE_DISABLED')
    if (operation === 'edit' && (!id || !uuid.test(id))) throw new SalesError(400, 'INVALID_ID')
    const method = operation === 'create' ? 'POST' : 'PATCH'
    if (request.method !== method) throw new SalesError(405, 'METHOD_NOT_ALLOWED')
    const version = request.headers.get('x-annie-expected-version')
    if (operation === 'edit' && (!version || !/^[1-9]\d*$/.test(version))) throw new SalesError(428, 'IF_MATCH_REQUIRED')
    const key = request.headers.get('idempotency-key')
    if (operation === 'create' && (!key || !uuid.test(key))) throw new SalesError(400, 'IDEMPOTENCY_KEY_REQUIRED')
    let payload: unknown
    try { payload = await request.json() } catch { throw new SalesError(400, 'INVALID_JSON') }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new SalesError(400, 'INVALID_BODY')
    const proposed = payload as Record<string, unknown>
    const body = JSON.stringify(proposed)
    if (Buffer.byteLength(body) > 16_384 || Object.hasOwn(proposed, 'programMembershipId'))
      throw new SalesError(400, 'INVALID_BODY')
    const { mapping, token } = await mappedActor(request)
    if (operation === 'create') {
      if (typeof proposed.title !== 'string' || !proposed.title.startsWith('QA PHASE C '))
        throw new SalesError(403, 'SYNTHETIC_TASK_REQUIRED')
    } else {
      const prior = scopedResult(await annieGet(`/api/crm/activities/tasks/${id}`,
        mapping.annie_organization_id, token), mapping.annie_organization_id) as { data?: { title?: unknown } }
      if (typeof prior.data?.title !== 'string' || !prior.data.title.startsWith('QA PHASE C ') ||
          (Object.hasOwn(proposed, 'title') &&
            (typeof proposed.title !== 'string' || !proposed.title.startsWith('QA PHASE C '))))
        throw new SalesError(403, 'SYNTHETIC_TASK_REQUIRED')
    }
    for (const [field, resource, nameField] of [
      ['leadId', 'leads', 'displayName'], ['contactId', 'contacts', 'displayName'],
      ['accountId', 'accounts', 'name'], ['opportunityId', 'opportunities', 'name'],
    ] as const) {
      const relation = proposed[field]
      if (relation === undefined || relation === null) continue
      if (typeof relation !== 'string' || !uuid.test(relation)) throw new SalesError(400, 'INVALID_RELATION_ID')
      const row = scopedResult(await annieGet(`/api/crm/${resource}/${relation}`,
        mapping.annie_organization_id, token), mapping.annie_organization_id) as { data?: Record<string, unknown> }
      if (typeof row.data?.[nameField] !== 'string' || !(row.data[nameField] as string).startsWith('QA PHASE C '))
        throw new SalesError(403, 'SYNTHETIC_RELATION_REQUIRED')
    }
    let upstream: Response
    try {
      upstream = await fetch(new URL(`/api/crm/activities/tasks${id ? `/${id}` : ''}`, origin()), {
        method, redirect: 'error', cache: 'no-store',
        headers: { Cookie: `annie_session=${token}; annie_org=${mapping.annie_organization_id}`,
          Origin: origin(), 'Content-Type': 'application/json', Accept: 'application/json',
          ...(key ? { 'Idempotency-Key': key } : {}), ...(version ? { 'If-Match': version } : {}) },
        body, signal: AbortSignal.timeout(10_000) })
    } catch { throw new SalesError(502, 'ANNIE_UNAVAILABLE') }
    if (upstream.status === 401 || upstream.status === 403) throw new SalesError(403, 'ANNIE_ACCESS_DENIED')
    let result: unknown
    try { result = await upstream.json() } catch { throw new SalesError(502, 'ANNIE_INVALID_RESPONSE') }
    if (!upstream.ok) {
      const code = (result as { code?: unknown })?.code
      throw new SalesError(upstream.status, typeof code === 'string' && /^[A-Z0-9_]{2,80}$/.test(code) ? code : 'ANNIE_REQUEST_FAILED')
    }
    scopedResult(result, mapping.annie_organization_id)
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof SalesError ? error : new SalesError(502, 'ANNIE_UNAVAILABLE')
    return Response.json({ code: known.code }, { status: known.status, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function salesRead(request: Request, resource: SalesResource | 'pipeline', id?: string): Promise<Response> {
  try {
    if (id && !uuid.test(id)) throw new SalesError(400, 'INVALID_ID')
    const query = new URL(request.url).searchParams
    if (id || resource === 'pipeline' || resource === 'dashboard') {
      if (Array.from(query.keys()).length) throw new SalesError(400, 'INVALID_FILTER')
    } else {
      const allowedKeys = resource === 'activities' ? activityKeys : listKeys
      for (const key of Array.from(query.keys())) if (!allowedKeys.has(key)) throw new SalesError(400, 'INVALID_FILTER')
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
