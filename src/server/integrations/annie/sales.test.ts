import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const id = {
  user: '11111111-1111-4111-8111-111111111111',
  profile: '22222222-2222-4222-8222-222222222222',
  principal: '33333333-3333-4333-8333-333333333333',
  org: '44444444-4444-4444-8444-444444444444',
  lead: '55555555-5555-4555-8555-555555555555',
}
const token = `annie_${'a'.repeat(40)}`
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), admin: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: mocks.admin }))

import { salesLeadHistory, salesLeadWrite, salesRead } from './sales'

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
  process.env.ANNIE_SALES_SESSION_TOKENS_JSON = JSON.stringify({ [`${id.principal}:${id.org}`]: token })
  mocks.createClient.mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: id.user } }, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    from: vi.fn().mockReturnValue(chain({ id: id.profile })),
  })
  mocks.admin.mockReturnValue({ from: vi.fn(() => chain({ empresa_codigo: null,
    access_kind: 'external_sales_entitlement', annie_organization_id: id.org, annie_principal_id: id.principal })) })
})
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); delete process.env.ANNIE_SALES_API_ORIGIN; delete process.env.ANNIE_SALES_SESSION_TOKENS_JSON; delete process.env.ANNIE_SALES_QA_ENABLED; delete process.env.ANNIE_SALES_QA_ALLOWLIST_JSON; delete process.env.ANNIE_SALES_QA_WRITE_ENABLED })

describe('ANNIE Sales adapter', () => {
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
    expect(fetch.mock.calls[1][1].headers.Cookie).toBe(`annie_session=${token}; annie_org=${id.org}`)
    expect(fetch.mock.calls[1][1].headers.Authorization).toBeUndefined()
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
    expect(fetch.mock.calls[1][1].headers).toMatchObject({ Origin: 'https://annie.example', Cookie: `annie_session=${token}; annie_org=${id.org}` })
  })
  it('requires a version for edits and transitions before any upstream call', async () => {
    process.env.ANNIE_SALES_QA_WRITE_ENABLED = 'true'
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect((await salesLeadWrite(write('PATCH', { displayName: 'Changed' }), 'edit', id.lead)).status).toBe(428)
    expect((await salesLeadWrite(write('POST', { status: 'CONTACTED' }), 'transition', id.lead)).status).toBe(428)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('keeps ANNIE transition and version errors authoritative', async () => {
    process.env.ANNIE_SALES_QA_WRITE_ENABLED = 'true'
    const fetch = vi.fn().mockResolvedValueOnce(identity()).mockResolvedValueOnce(
      Response.json({ code: 'INVALID_LEAD_TRANSITION' }, { status: 409 }))
    vi.stubGlobal('fetch', fetch)
    const response = await salesLeadWrite(write('POST', { status: 'WON' }, { 'If-Match': '1' }), 'transition', id.lead)
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
    const response = await salesLeadWrite(write('POST', { status: 'CONTACTED' }, { 'If-Match': '1' }), 'transition', id.lead)
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
    expect((await salesLeadWrite(write('PATCH', { nextAction: 'Call' }, { 'If-Match': '1' }), 'edit', id.lead)).status).toBe(200)
    expect((await salesLeadWrite(write('POST', { reason: 'QA', restore: false }, { 'If-Match': '2' }), 'archive', id.lead)).status).toBe(200)
    expect((await salesLeadWrite(write('POST', {}, { 'If-Match': '3', 'Idempotency-Key': 'phasecQA1' }), 'convert', id.lead)).status).toBe(200)
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
    expect((await salesLeadWrite(write('PATCH', { displayName: 'Changed' }, { 'If-Match': '1' }), 'edit', id.lead)).status).toBe(502)
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
