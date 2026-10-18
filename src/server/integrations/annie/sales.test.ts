import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const id = {
  user: '11111111-1111-4111-8111-111111111111',
  profile: '22222222-2222-4222-8222-222222222222',
  principal: '33333333-3333-4333-8333-333333333333',
  org: '44444444-4444-4444-8444-444444444444',
  lead: '55555555-5555-4555-8555-555555555555',
}
const key = Buffer.alloc(32, 7).toString('base64url')
const assertionCookie = expect.stringMatching(/^annie_session=eyJ[A-Za-z0-9_.-]+; annie_org=44444444-4444-4444-8444-444444444444$/)
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), admin: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: mocks.admin }))

import { salesAccessDetails, salesAccountHistory, salesAccountWrite, salesContactAccountLinks, salesContactHistory, salesContactLeads, salesContactWrite, salesExtendedRead, salesImportRequest, salesLeadHistory, salesLeadWrite, salesOpportunityRelated, salesOpportunityWrite, salesRead } from './sales'

function chain(data: unknown) {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return query
}
function request(url = 'https://lilly.example/api/integrations/annie/sales/leads') {
  return new Request(url, { headers: { Authorization: 'Bearer supabase-session' } })
}

beforeEach(() => {
  process.env.ANNIE_SALES_QA_ENABLED = 'true'
  process.env.ANNIE_SALES_QA_ALLOWLIST_JSON = JSON.stringify([{ lillyUsuarioId: id.profile, supabaseAuthId: id.user }])
  process.env.ANNIE_SALES_API_ORIGIN = 'https://annie.example'
  process.env.ANNIE_SALES_TRUST_KEY = key
  mocks.createClient.mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: id.user } }, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    from: vi.fn().mockReturnValue(chain({ id: id.profile })),
  })
  mocks.admin.mockReturnValue({ from: vi.fn(() => chain({ empresa_codigo: null,
    access_kind: 'external_sales_entitlement', annie_organization_id: id.org, annie_principal_id: id.principal })) })
})
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); delete process.env.ANNIE_SALES_API_ORIGIN; delete process.env.ANNIE_SALES_TRUST_KEY; delete process.env.ANNIE_SALES_ENABLED; delete process.env.ANNIE_SALES_QA_ENABLED; delete process.env.ANNIE_SALES_QA_ALLOWLIST_JSON; delete process.env.ANNIE_SALES_QA_WRITE_ENABLED; delete process.env.ANNIE_SALES_QA_CONTACT_WRITE_ENABLED; delete process.env.ANNIE_SALES_QA_ACCOUNT_WRITE_ENABLED; delete process.env.ANNIE_SALES_QA_OPPORTUNITY_WRITE_ENABLED; delete process.env.ANNIE_SALES_IMPORT_ENABLED })

describe('ANNIE-owned import workflow boundary', () => {
  it('keeps upload and processing disabled independently of Lead writes', async () => {
    process.env.ANNIE_SALES_QA_WRITE_ENABLED = 'true'
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    const form = new FormData(); form.set('destination', 'LEAD'); form.set('file', new File(['name'], 'qa.csv'))
    const upload = new Request('https://lilly.example/api/integrations/annie/sales/imports', { method: 'POST',
      headers: { Authorization: 'Bearer supabase-session', 'Idempotency-Key': id.lead }, body: form })
    expect((await salesImportRequest(upload, [])).status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('rejects unknown paths and client supplied organization fields', async () => {
    process.env.ANNIE_SALES_IMPORT_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ data: {
      principalId: id.principal, organizationId: id.org, capabilities: { salesRead: true },
    } }))
    vi.stubGlobal('fetch', fetch)
    const preview = new Request(`https://lilly.example/api/integrations/annie/sales/imports/${id.lead}/preview`, {
      method: 'POST', headers: { Authorization: 'Bearer supabase-session' },
      body: JSON.stringify({ organizationId: 'other', sheetName: 'CSV', mapping: [] }),
    })
    expect((await salesImportRequest(preview, [id.lead, 'preview'])).status).toBe(400)
    expect((await salesImportRequest(request(), ['all'])).status).toBe(404)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe('Phase C Opportunity write boundary', () => {
  const identity = () => Response.json({ data: { principalId: id.principal, organizationId: id.org,
    capabilities: { salesRead: true } } })
  const write = (method: string, body: object, version?: string) => new Request('https://lilly.example/api/integrations/annie/sales/opportunities', {
    method, headers: { Authorization: 'Bearer supabase-session', ...(version ? { 'X-Annie-Expected-Version': version } : {}) },
    body: JSON.stringify(body),
  })
  it('remains off when other commercial write switches are on', async () => {
    process.env.ANNIE_SALES_QA_ACCOUNT_WRITE_ENABLED = 'true'
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    expect((await salesOpportunityWrite(write('POST', { name: 'QA PHASE C Opportunity' }), 'create')).status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('rejects a non-synthetic create before ANNIE commercial writes', async () => {
    process.env.ANNIE_SALES_QA_OPPORTUNITY_WRITE_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(identity()); vi.stubGlobal('fetch', fetch)
    expect((await salesOpportunityWrite(write('POST', { name: 'Real Deal' }), 'create')).status).toBe(403)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('rejects a transition on an existing real Opportunity', async () => {
    process.env.ANNIE_SALES_QA_OPPORTUNITY_WRITE_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: {
      id: id.lead, organizationId: id.org, name: 'Real Deal', version: 3,
    } })); vi.stubGlobal('fetch', fetch)
    expect((await salesOpportunityWrite(write('POST', { stageCode: 'LOST', lostReason: 'QA' }, '3'), 'transition', id.lead)).status).toBe(403)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('forwards synthetic transition with version and preserves ANNIE conflict', async () => {
    process.env.ANNIE_SALES_QA_OPPORTUNITY_WRITE_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: {
      id: id.lead, organizationId: id.org, name: 'QA PHASE C Opportunity', version: 3,
    } })).mockResolvedValueOnce(Response.json({ code: 'VERSION_CONFLICT' }, { status: 409 }))
    vi.stubGlobal('fetch', fetch)
    const response = await salesOpportunityWrite(write('POST', { stageCode: 'PROPOSAL', amount: '100.00' }, '2'), 'transition', id.lead)
    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe('VERSION_CONFLICT')
    expect(fetch.mock.calls[2][1].headers).toMatchObject({ 'If-Match': '2',
      Cookie: assertionCookie })
    expect(String(fetch.mock.calls[2][0])).toContain(`/api/crm/opportunities/${id.lead}/transitions`)
  })
  it('reads links/history only in the mapped organization', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: [{
      id: id.lead, organizationId: id.org, contactId: id.user,
    }] })); vi.stubGlobal('fetch', fetch)
    expect((await salesOpportunityRelated(request(`https://lilly.example/api/integrations/annie/sales/opportunities/${id.lead}/contacts`), id.lead, 'contacts')).status).toBe(200)
    expect(String(fetch.mock.calls[1][0])).toContain(`/api/crm/opportunities/${id.lead}/contacts`)
  })
})

describe('Phase C Account write boundary', () => {
  const identity = () => Response.json({ data: { principalId: id.principal, organizationId: id.org,
    capabilities: { salesRead: true } } })
  const write = (method: string, body: object, version?: string) => new Request('https://lilly.example/api/integrations/annie/sales/accounts', {
    method, headers: { Authorization: 'Bearer supabase-session', ...(version ? { 'X-Annie-Expected-Version': version } : {}) },
    body: JSON.stringify(body),
  })
  it('stays off by default and cannot be enabled by Contact writes', async () => {
    process.env.ANNIE_SALES_QA_CONTACT_WRITE_ENABLED = 'true'
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    expect((await salesAccountWrite(write('POST', { name: 'QA PHASE C Account' }), 'create')).status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('rejects a real Account name on create without touching ANNIE commercial records', async () => {
    process.env.ANNIE_SALES_QA_ACCOUNT_WRITE_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(identity())
    vi.stubGlobal('fetch', fetch)
    expect((await salesAccountWrite(write('POST', { name: 'Real Customer' }), 'create')).status).toBe(403)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('requires version and rejects edits to a real Account even with the switch on', async () => {
    process.env.ANNIE_SALES_QA_ACCOUNT_WRITE_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: {
      id: id.lead, name: 'Real Customer', organizationId: id.org, version: 2,
    } }))
    vi.stubGlobal('fetch', fetch)
    expect((await salesAccountWrite(write('PATCH', { description: 'QA' }), 'edit', id.lead)).status).toBe(428)
    expect((await salesAccountWrite(write('PATCH', { description: 'QA' }, '2'), 'edit', id.lead)).status).toBe(403)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('forwards a versioned synthetic Account edit to ANNIE and preserves its ID', async () => {
    process.env.ANNIE_SALES_QA_ACCOUNT_WRITE_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: {
      id: id.lead, name: 'QA PHASE C Account', organizationId: id.org, version: 2,
    } })).mockResolvedValueOnce(Response.json({ data: {
      id: id.lead, name: 'QA PHASE C Account', organizationId: id.org, version: 3,
    } }))
    vi.stubGlobal('fetch', fetch)
    const response = await salesAccountWrite(write('PATCH', { description: 'Synthetic' }, '2'), 'edit', id.lead)
    expect(response.status).toBe(200)
    expect((await response.json()).data.id).toBe(id.lead)
    expect(fetch.mock.calls[2][1].headers).toMatchObject({ 'If-Match': '2',
      Cookie: assertionCookie })
  })
  it('reads Account history only through the mapped ANNIE session', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: [{
      id: id.lead, organizationId: id.org,
    }] }))
    vi.stubGlobal('fetch', fetch)
    expect((await salesAccountHistory(request(`https://lilly.example/api/integrations/annie/sales/accounts/${id.lead}/history?limit=25`), id.lead)).status).toBe(200)
    expect(String(fetch.mock.calls[1][0])).toContain(`/api/crm/accounts/${id.lead}/history?limit=25`)
  })
})

describe('ANNIE Sales adapter', () => {
  it('allows only named ANNIE Sales extras and rejects accounting or OAuth paths', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    expect((await salesExtendedRead(request(), ['quickbooks', 'connections'])).status).toBe(404)
    expect((await salesExtendedRead(request(), ['meta', 'oauth', 'start'])).status).toBe(404)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('keeps membership list rows in the mapped organization', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ data: {
      principalId: id.principal, organizationId: id.org, role: 'OPERATOR',
      capabilities: { salesRead: true },
    } })).mockResolvedValueOnce(Response.json({ data: [{ id: id.lead,
      organizationId: 'other', code: 'DEMO' }] }))
    vi.stubGlobal('fetch', fetch)
    const response = await salesExtendedRead(request(), ['memberships'])
    expect(response.status).toBe(502)
    expect(String(fetch.mock.calls[1][0])).toContain('/api/crm/program-memberships')
  })
  it('uses the canonical ANNIE role and capabilities for UI access', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ data: {
      principalId: id.principal, organizationId: id.org, role: 'SALES_MANAGER',
      capabilities: { salesRead: true, salesWrite: true, salesReassign: true, salesAuditRead: false },
    } }))
    vi.stubGlobal('fetch', fetch)
    expect(await salesAccessDetails(request())).toEqual({ allowed: true, role: 'SALES_MANAGER',
      canWrite: true, canReassign: true, canReadAudit: false })
  })
  it('fails closed when ANNIE omits its role or denies commercial read', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ data: {
      principalId: id.principal, organizationId: id.org, capabilities: { salesRead: true },
    } })).mockResolvedValueOnce(Response.json({ data: {
      principalId: id.principal, organizationId: id.org, role: 'FINANCE',
      capabilities: { salesRead: false },
    } }))
    vi.stubGlobal('fetch', fetch)
    expect((await salesAccessDetails(request())).allowed).toBe(false)
    expect((await salesAccessDetails(request())).allowed).toBe(false)
  })
  it('admits an approved mapping after Sales rollout without the original QA allowlist', async () => {
    delete process.env.ANNIE_SALES_QA_ENABLED
    process.env.ANNIE_SALES_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ data: { principalId: id.principal,
      organizationId: id.org, capabilities: { salesRead: true } } }))
      .mockResolvedValueOnce(Response.json({ data: [{ id: id.lead, organizationId: id.org }] }))
    vi.stubGlobal('fetch', fetch)
    expect((await salesRead(request(), 'leads')).status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('is disabled without an explicit QA switch and exact ID pair', async () => {
    delete process.env.ANNIE_SALES_QA_ENABLED
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect((await salesRead(request(), 'leads')).status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('rejects unapproved query keys before authentication or upstream access', async () => {
    const response = await salesRead(request('https://lilly.example/api/integrations/annie/sales/leads?organizationId=other'), 'leads')
    expect(response.status).toBe(400)
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
  it('denies a session for the wrong Principal before reading commercial records', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ data: {
      principalId: 'other', organizationId: id.org, capabilities: { salesRead: true },
    } }))
    vi.stubGlobal('fetch', fetch)
    const response = await salesRead(request(), 'leads')
    expect(response.status).toBe(403)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('denies an unmapped user without contacting ANNIE', async () => {
    mocks.admin.mockReturnValue({ from: vi.fn().mockReturnValue(chain(null)) })
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect((await salesRead(request(), 'leads')).status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('keeps the LILLY primary company separate from an external Sales entitlement', async () => {
    const from = vi.fn(() => chain({ empresa_codigo: null, access_kind: 'external_sales_entitlement',
      annie_organization_id: id.org, annie_principal_id: id.principal }))
    mocks.admin.mockReturnValue({ from })
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: { principalId: id.principal, organizationId: id.org, capabilities: { salesRead: true } } }))
      .mockResolvedValueOnce(Response.json({ data: [{ id: id.lead, organizationId: id.org }] }))
    vi.stubGlobal('fetch', fetch)
    expect((await salesRead(request(), 'leads')).status).toBe(200)
    expect(from).not.toHaveBeenCalledWith('annie_sales_tenant_mappings')
  })
  it('honors ANNIE FINANCE denial even if LILLY grants the Sales module', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ data: {
      principalId: id.principal, organizationId: id.org, capabilities: { salesRead: false },
    } }))
    vi.stubGlobal('fetch', fetch)
    expect((await salesRead(request(), 'leads')).status).toBe(403)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('forwards only the mapped Organization and preserves ANNIE IDs and cursor', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: {
        principalId: id.principal, organizationId: id.org, capabilities: { salesRead: true },
      } }))
      .mockResolvedValueOnce(Response.json({ data: [{ id: id.lead, organizationId: id.org }], nextCursor: id.lead }))
    vi.stubGlobal('fetch', fetch)
    const response = await salesRead(request('https://lilly.example/api/integrations/annie/sales/leads?limit=1&q=Acme'), 'leads')
    expect(response.status).toBe(200)
    expect((await response.json()).nextCursor).toBe(id.lead)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(String(fetch.mock.calls[0][0])).toContain('/api/crm/integration/session/identity')
    expect(String(fetch.mock.calls[1][0])).toContain('/api/crm/leads?limit=1&q=Acme')
    expect(fetch.mock.calls[1][1].method).toBe('GET')
    expect(fetch.mock.calls[1][1].headers.Cookie).toEqual(assertionCookie)
    expect(fetch.mock.calls[1][1].headers.Authorization).toBeUndefined()
    const signed = String(fetch.mock.calls[1][1].headers.Cookie).split(';')[0].slice('annie_session='.length)
    const [header, payload, signature] = signed.split('.')
    expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({ alg: 'HS256', typ: 'JWT' })
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString())
    expect(claims).toMatchObject({ iss: 'lilly-sales', aud: 'annie-sales', sub: id.principal, org: id.org, purpose: 'sales' })
    expect(claims.exp - claims.iat).toBe(30)
    expect(signature).toMatch(/^[A-Za-z0-9_-]+$/)
  })
  it('allows scoped activity views and rejects unrelated task filters', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: {
        principalId: id.principal, organizationId: id.org, capabilities: { salesRead: true },
      } }))
      .mockResolvedValueOnce(Response.json({ data: [{ id: id.lead, organizationId: id.org, title: 'QA follow-up' }] }))
    vi.stubGlobal('fetch', fetch)
    const response = await salesRead(request('https://lilly.example/api/integrations/annie/sales/activities?view=overdue&timezone=America%2FNew_York'), 'activities')
    expect(response.status).toBe(200)
    expect(String(fetch.mock.calls[1][0])).toContain('/api/crm/activities/tasks?view=overdue&timezone=America%2FNew_York')
    expect((await salesRead(request('https://lilly.example/api/integrations/annie/sales/activities?ownerProfileId=other'), 'activities')).status).toBe(400)
  })
  it('rejects an out-of-scope upstream row even after identity verification', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: {
        principalId: id.principal, organizationId: id.org, capabilities: { salesRead: true },
      } }))
      .mockResolvedValueOnce(Response.json({ data: [{ id: id.lead, organizationId: 'other' }] }))
    vi.stubGlobal('fetch', fetch)
    expect((await salesRead(request(), 'leads')).status).toBe(502)
  })
})

describe('Phase C Contact write boundary', () => {
  const identity = () => Response.json({ data: { principalId: id.principal, organizationId: id.org,
    capabilities: { salesRead: true } } })
  function write(method: string, body: unknown, version?: string) {
    return new Request('https://lilly.example/api/integrations/annie/sales/contacts', {
      method, headers: { Authorization: 'Bearer supabase-session', 'Content-Type': 'application/json',
        ...(version ? { 'X-Annie-Expected-Version': version } : {}) }, body: JSON.stringify(body),
    })
  }
  it('stays disabled even when Lead writes are enabled', async () => {
    process.env.ANNIE_SALES_QA_WRITE_ENABLED = 'true'
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    expect((await salesContactWrite(write('POST', { displayName: 'QA' }), 'create')).status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('forwards a versioned Contact create and edit through the mapped ANNIE session', async () => {
    process.env.ANNIE_SALES_QA_CONTACT_WRITE_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: {
      id: id.lead, organizationId: id.org, version: 1,
    } }, { status: 201 })).mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: {
      id: id.lead, organizationId: id.org, version: 2,
    } }))
    vi.stubGlobal('fetch', fetch)
    expect((await salesContactWrite(write('POST', { displayName: 'QA' }), 'create')).status).toBe(201)
    expect(String(fetch.mock.calls[1][0])).toBe('https://annie.example/api/crm/contacts')
    expect((await salesContactWrite(write('PATCH', { title: 'QA title' }, '1'), 'edit', id.lead)).status).toBe(200)
    expect(fetch.mock.calls[3][1].headers['If-Match']).toBe('1')
    expect(fetch.mock.calls[3][1].headers.Cookie).toEqual(assertionCookie)
  })
  it('requires a version for archive and rejects out-of-Organization responses', async () => {
    process.env.ANNIE_SALES_QA_CONTACT_WRITE_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: {
      id: id.lead, organizationId: 'other', version: 1,
    } }))
    vi.stubGlobal('fetch', fetch)
    expect((await salesContactWrite(write('POST', { reason: 'QA', restore: false }), 'archive', id.lead)).status).toBe(428)
    expect(fetch).not.toHaveBeenCalled()
    expect((await salesContactWrite(write('POST', { displayName: 'QA' }), 'create')).status).toBe(502)
  })
  it('reads Contact history only with the verified Principal and Organization', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: [{
      id: id.lead, organizationId: id.org,
    }] }))
    vi.stubGlobal('fetch', fetch)
    const response = await salesContactHistory(request(`https://lilly.example/api/integrations/annie/sales/contacts/${id.lead}/history?limit=10`), id.lead)
    expect(response.status).toBe(200)
    expect(String(fetch.mock.calls[1][0])).toContain(`/api/crm/contacts/${id.lead}/history?limit=10`)
  })
  it('keeps related Leads scoped to the mapped Organization', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: [{
      id: id.lead, organizationId: 'other',
    }] }))
    vi.stubGlobal('fetch', fetch)
    expect((await salesContactLeads(request(`https://lilly.example/api/integrations/annie/sales/contacts/${id.lead}/leads`), id.lead)).status).toBe(502)
    expect(String(fetch.mock.calls[1][0])).toBe(`https://annie.example/api/crm/contacts/${id.lead}/leads`)
  })
  it('rejects unsupported Contact-origin Lead filters before contacting ANNIE', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    expect((await salesContactLeads(request(`https://lilly.example/api/integrations/annie/sales/contacts/${id.lead}/leads?limit=25`), id.lead)).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('keeps Account link changes off with Contact writes and rejects broad payloads', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    const url = `https://lilly.example/api/integrations/annie/sales/accounts/${id.lead}/contacts`
    const make = (body: object) => new Request(url, { method: 'POST',
      headers: { Authorization: 'Bearer supabase-session', 'X-Annie-Expected-Version': '2' },
      body: JSON.stringify(body) })
    expect((await salesContactAccountLinks(make({ contactId: id.lead, active: false }), id.lead)).status).toBe(403)
    process.env.ANNIE_SALES_QA_CONTACT_WRITE_ENABLED = 'true'
    expect((await salesContactAccountLinks(make({ contactId: id.lead, active: true }), id.lead)).status).toBe(400)
    expect((await salesContactAccountLinks(make({ contactId: id.lead, active: false, role: 'admin' }), id.lead)).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('uses ANNIE version and tenant policy to deactivate only an existing Account link', async () => {
    process.env.ANNIE_SALES_QA_CONTACT_WRITE_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: {
      accountId: id.lead, contactId: id.lead, organizationId: id.org, active: false,
    } }))
    vi.stubGlobal('fetch', fetch)
    const response = await salesContactAccountLinks(new Request(
      `https://lilly.example/api/integrations/annie/sales/accounts/${id.lead}/contacts`, {
        method: 'POST', headers: { Authorization: 'Bearer supabase-session', 'X-Annie-Expected-Version': '2' },
        body: JSON.stringify({ contactId: id.lead, active: false }),
      }), id.lead)
    expect(response.status).toBe(200)
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'POST',
      body: JSON.stringify({ contactId: id.lead, active: false }) })
    expect(fetch.mock.calls[1][1].headers).toMatchObject({
      'If-Match': '2', Cookie: assertionCookie,
    })
  })
  it('rejects out-of-Organization Account links', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: [{
      accountId: id.lead, contactId: id.lead, organizationId: 'other', active: true,
    }] }))
    vi.stubGlobal('fetch', fetch)
    expect((await salesContactAccountLinks(request(
      `https://lilly.example/api/integrations/annie/sales/accounts/${id.lead}/contacts`), id.lead)).status).toBe(502)
  })
})

describe('Phase C Lead write boundary', () => {
  function write(method: string, body: unknown, headers: Record<string, string> = {}) {
    return new Request('https://lilly.example/api/integrations/annie/sales/leads', {
      method, headers: { Authorization: 'Bearer supabase-session', 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  }
  function identity() {
    return Response.json({ data: { principalId: id.principal, organizationId: id.org,
      capabilities: { salesRead: true } } })
  }
  it('remains disabled by default even for the owner mapping', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect((await salesLeadWrite(write('POST', { displayName: 'QA', source: 'manual' }), 'create')).status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('forwards a Lead create only through ANNIE and preserves its ID', async () => {
    process.env.ANNIE_SALES_QA_WRITE_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: {
      id: id.lead, organizationId: id.org, version: 1,
    } }, { status: 201 }))
    vi.stubGlobal('fetch', fetch)
    const response = await salesLeadWrite(write('POST', { displayName: 'QA', source: 'manual' }), 'create')
    expect(response.status).toBe(201)
    expect((await response.json()).data.id).toBe(id.lead)
    expect(String(fetch.mock.calls[1][0])).toBe('https://annie.example/api/crm/leads')
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ displayName: 'QA', source: 'manual' }) })
    expect(fetch.mock.calls[1][1].headers).toMatchObject({ Origin: 'https://annie.example', Cookie: assertionCookie })
  })
  it('requires a version for edits and transitions before any upstream call', async () => {
    process.env.ANNIE_SALES_QA_WRITE_ENABLED = 'true'
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect((await salesLeadWrite(write('PATCH', { displayName: 'Changed' }), 'edit', id.lead)).status).toBe(428)
    expect((await salesLeadWrite(write('POST', { status: 'CONTACTED' }), 'transition', id.lead)).status).toBe(428)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('does not accept a browser If-Match header as the adapter version', async () => {
    process.env.ANNIE_SALES_QA_WRITE_ENABLED = 'true'
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect((await salesLeadWrite(write('PATCH', { nextAction: 'Call' }, { 'If-Match': '1' }), 'edit', id.lead)).status).toBe(428)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('keeps ANNIE transition and version errors authoritative', async () => {
    process.env.ANNIE_SALES_QA_WRITE_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(
      Response.json({ code: 'INVALID_LEAD_TRANSITION' }, { status: 409 }))
    vi.stubGlobal('fetch', fetch)
    const response = await salesLeadWrite(write('POST', { status: 'WON' }, { 'X-Annie-Expected-Version': '1' }), 'transition', id.lead)
    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe('INVALID_LEAD_TRANSITION')
    expect(fetch.mock.calls[1][1].headers['If-Match']).toBe('1')
  })
  it('allows a valid transition only after ANNIE accepts it and keeps the versioned ID', async () => {
    process.env.ANNIE_SALES_QA_WRITE_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: {
      id: id.lead, organizationId: id.org, version: 2, status: 'CONTACTED',
    } }))
    vi.stubGlobal('fetch', fetch)
    const response = await salesLeadWrite(write('POST', { status: 'CONTACTED' }, { 'X-Annie-Expected-Version': '1' }), 'transition', id.lead)
    expect(response.status).toBe(200)
    expect((await response.json()).data).toMatchObject({ id: id.lead, status: 'CONTACTED', version: 2 })
    expect(String(fetch.mock.calls[1][0])).toBe(`https://annie.example/api/crm/leads/${id.lead}/transitions`)
  })
  it('forwards edit, archive and conversion to ANNIE with version and conversion idempotency', async () => {
    process.env.ANNIE_SALES_QA_WRITE_ENABLED = 'true'
    const fetch = vi.fn()
      .mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: { id: id.lead, organizationId: id.org, version: 2 } }))
      .mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: { id: id.lead, organizationId: id.org, version: 3 } }))
      .mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: { leadId: id.lead, accountId: '66666666-6666-4666-8666-666666666666' } }))
    vi.stubGlobal('fetch', fetch)
    expect((await salesLeadWrite(write('PATCH', { nextAction: 'Call' }, { 'X-Annie-Expected-Version': '1' }), 'edit', id.lead)).status).toBe(200)
    expect((await salesLeadWrite(write('POST', { reason: 'QA', restore: false }, { 'X-Annie-Expected-Version': '2' }), 'archive', id.lead)).status).toBe(200)
    expect((await salesLeadWrite(write('POST', {}, { 'X-Annie-Expected-Version': '3', 'Idempotency-Key': 'phasecQA1' }), 'convert', id.lead)).status).toBe(200)
    expect(fetch.mock.calls[3][1].headers['If-Match']).toBe('2')
    expect(fetch.mock.calls[5][1].headers['Idempotency-Key']).toBe('phasecQA1')
    expect(String(fetch.mock.calls[5][0])).toBe(`https://annie.example/api/crm/leads/${id.lead}/convert`)
  })
  it('denies a mapped caller when ANNIE identity lacks commercial read before any write', async () => {
    process.env.ANNIE_SALES_QA_WRITE_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValue(Response.json({ data: { principalId: id.principal,
      organizationId: id.org, capabilities: { salesRead: false },
    } }))
    vi.stubGlobal('fetch', fetch)
    expect((await salesLeadWrite(write('POST', { displayName: 'QA', source: 'manual' }), 'create')).status).toBe(403)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('preserves ANNIE commercial-write denial after a valid mapped read identity', async () => {
    process.env.ANNIE_SALES_QA_WRITE_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(
      Response.json({ code: 'FORBIDDEN' }, { status: 403 }))
    vi.stubGlobal('fetch', fetch)
    const response = await salesLeadWrite(write('POST', { displayName: 'QA', source: 'manual' }), 'create')
    expect(response.status).toBe(403)
    expect((await response.json()).code).toBe('FORBIDDEN')
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('rejects an out-of-Organization write response', async () => {
    process.env.ANNIE_SALES_QA_WRITE_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: {
      id: id.lead, organizationId: 'other', version: 2,
    } }))
    vi.stubGlobal('fetch', fetch)
    expect((await salesLeadWrite(write('PATCH', { displayName: 'Changed' }, { 'X-Annie-Expected-Version': '1' }), 'edit', id.lead)).status).toBe(502)
  })
  it('reads ANNIE history with the same mapped session and Organization', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(Response.json({ data: [{
      id: '66666666-6666-4666-8666-666666666666', organizationId: id.org,
    }] }))
    vi.stubGlobal('fetch', fetch)
    const response = await salesLeadHistory(request(`https://lilly.example/api/integrations/annie/sales/leads/${id.lead}/history?limit=10`), id.lead)
    expect(response.status).toBe(200)
    expect(String(fetch.mock.calls[1][0])).toContain(`/api/crm/leads/${id.lead}/history?limit=10`)
  })
})
