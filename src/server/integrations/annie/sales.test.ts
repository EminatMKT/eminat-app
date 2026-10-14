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

import { salesRead } from './sales'

function chain(data: unknown) {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return query
}
function request(url = 'https://lilly.example/api/integrations/annie/sales/leads') {
  return new Request(url, { headers: { Authorization: 'Bearer supabase-session', 'X-Lilly-Company-Code': 'ACME' } })
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
  mocks.admin.mockReturnValue({ from: vi.fn((table: string) => chain(table === 'annie_sales_tenant_mappings'
    ? { empresa_codigo: 'ACME', annie_organization_id: id.org }
    : { empresa_codigo: 'ACME', annie_organization_id: id.org, annie_principal_id: id.principal })) })
})
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); delete process.env.ANNIE_SALES_API_ORIGIN; delete process.env.ANNIE_SALES_SESSION_TOKENS_JSON; delete process.env.ANNIE_SALES_QA_ENABLED; delete process.env.ANNIE_SALES_QA_ALLOWLIST_JSON })

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
  it('denies an unmapped tenant without contacting ANNIE', async () => {
    mocks.admin.mockReturnValue({ from: vi.fn().mockReturnValue(chain(null)) })
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect((await salesRead(request(), 'leads')).status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
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
