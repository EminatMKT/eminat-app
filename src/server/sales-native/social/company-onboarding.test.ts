import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), actor: vi.fn() }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: () => ({ rpc: mocks.rpc }) }))
vi.mock('../auth', () => ({
  NativeSalesAuthError: class extends Error {
    constructor(readonly status: number, readonly code: string) { super(code) }
  },
  resolveSalesActor: mocks.actor,
  nativeSalesErrorResponse: (error: { status: number; code: string }) => Response.json({ code: error.code }, {
    status: error.status, headers: { 'Cache-Control': 'no-store' },
  }),
}))
import { listMetaCompanies, manageMetaCompany } from './company-onboarding'
import { GET, POST } from '@/app/api/sales-native/social/companies/route'
import type { SalesActor, SalesRole } from '../policy'
const actor: SalesActor = {
  organizationId: 'e0000000-0000-4000-8000-000000000021',
  memberId: 'e0000000-0000-4000-8000-000000000011',
  userId: 'e0000000-0000-4000-8000-000000000001', role: 'ADMINISTRATOR', teamIds: [],
}
const input = { companyCode: 'ARBITRARY_CLIENT', active: true, relationship: 'AGENCY_DELEGATED', acknowledged: true }
beforeEach(() => {
  mocks.rpc.mockReset().mockResolvedValue({ data: { enabled: true, ingestionEnabled: false }, error: null })
  mocks.actor.mockReset().mockResolvedValue(actor)
})
describe('Self-service Meta company onboarding', () => {
  it.each(['SELLER', 'SALES_MANAGER', 'FINANCE', 'AUDITOR'] as SalesRole[])('denies %s without querying privileged RPCs', async role => {
    const denied = { ...actor, role }
    await expect(listMetaCompanies(denied)).rejects.toMatchObject({ status: 403 })
    await expect(manageMetaCompany(denied, input)).rejects.toMatchObject({ status: 403 })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it.each(['ADMINISTRATOR', 'SUPERADMIN'] as SalesRole[])('permits %s but supplies only the server-resolved actor', async role => {
    await manageMetaCompany({ ...actor, role }, input)
    expect(mocks.rpc).toHaveBeenCalledWith('native_meta_manage_company', {
      p_org: actor.organizationId, p_member: actor.memberId, p_company: 'ARBITRARY_CLIENT',
      p_active: true, p_relationship: 'AGENCY_DELEGATED',
    })
  })
  it.each(['organizationId', 'memberId', 'approvedBy', 'userId', 'token', 'evidenceRef'])('rejects injected %s', async field => {
    await expect(manageMetaCompany(actor, { ...input, [field]: 'foreign' })).rejects.toMatchObject({ status: 422 })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it.each([{ ...input, acknowledged: false }, { ...input, acknowledged: undefined },
    { ...input, relationship: 'TRANSFER_OWNER' }, { ...input, relationship: null }, { ...input, companyCode: ' ' },
    { ...input, companyCode: 'x'.repeat(101) }, { ...input, active: 'true' }])('rejects incomplete/invalid declarations', async body => {
    await expect(manageMetaCompany(actor, body)).rejects.toMatchObject({ status: 422 })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it.each([['42501', 403], ['22023', 422], ['XX000', 503]])('sanitizes database error %s', async (code, status) => {
    mocks.rpc.mockResolvedValue({ error: { code, message: 'private database detail' } })
    await expect(manageMetaCompany(actor, input)).rejects.toMatchObject({ status })
    await expect(listMetaCompanies(actor)).rejects.not.toThrow('private database detail')
  })
  it('returns metadata with no-store and never accepts browser actor IDs', async () => {
    const response = await POST(new Request('http://localhost/api/sales-native/social/companies', {
      method: 'POST', body: JSON.stringify(input),
    }))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ data: { enabled: true, ingestionEnabled: false } })
    expect((await GET(new Request('http://localhost'))).headers.get('cache-control')).toBe('no-store')
  })
  it('can disable a legacy relationship without inventing an ownership declaration', async () => {
    await manageMetaCompany(actor, { ...input, active: false, relationship: null })
    expect(mocks.rpc).toHaveBeenCalledWith('native_meta_manage_company', expect.objectContaining({ p_active: false, p_relationship: null }))
  })
  it('rejects oversized input before mutation', async () => {
    const response = await POST(new Request('http://localhost', { method: 'POST', body: ' '.repeat(16385) }))
    expect(response.status).toBe(413)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('does not query any database when authentication fails', async () => {
    const { NativeSalesAuthError } = await import('../auth')
    mocks.actor.mockRejectedValue(new NativeSalesAuthError(401, 'AUTHENTICATION_REQUIRED'))
    expect((await GET(new Request('http://localhost'))).status).toBe(401)
    expect((await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(input) }))).status).toBe(401)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
