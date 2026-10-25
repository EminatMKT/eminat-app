import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), admin: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: mocks.admin }))

import { patientQboActor } from './patient-qbo-auth'
import { qboManager } from './quickbooks/connection'
import { GET } from '@/app/api/sales-native/patient-qbo/route'

const EMC = '9efab353-46a0-43d1-9901-e3f185dc5d30'
const STRATIX = '00b69cc1-d6f1-4972-9fab-d6aa02d611d7'
const OWNER = 'c67e9779-9e87-48b0-9f6c-bf6a0c8cebad'
const USER = '2344e112-76ef-42a8-ac56-7c488084e0f5'
const AUTH = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const EVIDENCE = 'owner-approved-emc-patient-fallback-2026-10-20'
type Row = Record<string, unknown>

// Synthetic rows exercise the real native membership resolver, not a mocked
// authorization decision. No database, provider, token refresh or writes occur.
function fixture({ status = 'active', role = 'SUPERADMIN', organization = EMC,
  user = USER, auth = AUTH, member = OWNER, evidence = EVIDENCE,
  profileActive = true, organizationActive = true, databaseError = false,
  secondMembership = false } = {}) {
  const data: Record<string, Row[]> = {
    usuarios: [{ id: USER, auth_id: AUTH, activo: profileActive }],
    sales_members: [{ id: member, organization_id: organization, user_id: user,
      auth_id: auth, role, status, evidence_ref: evidence }],
    sales_organizations: [{ id: organization, status: organizationActive ? 'active' : 'inactive' }],
    sales_team_members: [],
  }
  if (secondMembership) {
    data.sales_members.push({ id: OTHER, organization_id: STRATIX, user_id: USER,
      auth_id: AUTH, role: 'SUPERADMIN', status: 'active' })
    data.sales_organizations.push({ id: STRATIX, status: 'active' })
  }
  const from = vi.fn((table: string) => {
    let rows = data[table] ?? []
    const result = () => ({ data: databaseError ? null : rows, error: databaseError ? { code: 'UNAVAILABLE' } : null })
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn((key: string, value: unknown) => {
        rows = rows.filter(row => row[key] === value); return chain
      }),
      not: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(async (limit: number) => ({ ...result(), data: databaseError ? null : rows.slice(0, limit) })),
      maybeSingle: vi.fn(async () => ({ ...result(), data: databaseError ? null : rows[0] ?? null })),
    }
    return chain
  })
  mocks.admin.mockReturnValue({ from })
  return { from }
}
const request = (organization: string | null = EMC, token = 'Bearer synthetic-session') =>
  new Request('https://lilly.example/api/sales-native/patient-qbo', {
    headers: { authorization: token, ...(organization === null ? {} : { 'X-Sales-Organization-Id': organization }) },
  })

beforeEach(() => {
  vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'true')
  mocks.createClient.mockReturnValue({ auth: { getUser: vi.fn().mockResolvedValue({
    data: { user: { id: AUTH } }, error: null,
  }) } })
})
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs() })

describe('EMC QBO membership lifecycle compatibility', () => {
  it('accepts the active EMC SUPERADMIN even with another active corporate membership', async () => {
    fixture({ secondMembership: true })
    expect(await patientQboActor(request())).toEqual({ memberId: OWNER, verifier: true })
    expect(await qboManager(request())).toBe(OWNER)
  })
  it('uses normal active membership authorization for other approved EMC superadmins too', async () => {
    fixture({ member: OTHER, evidence: 'approved-emc-admin' })
    expect(await patientQboActor(request())).toEqual({ memberId: OTHER, verifier: true })
    expect(await qboManager(request())).toBe(OTHER)
  })
  it('returns HTTP 200 from the real read-only follow-up route for the active EMC admin', async () => {
    fixture({ secondMembership: true })
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: [], canVerify: true })
  })
  it('keeps the follow-up route at HTTP 403 for an unauthorized corporate-only admin', async () => {
    fixture({ organization: STRATIX, member: OTHER })
    const response = await GET(request())
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ code: 'SALES_ACCESS_DENIED' })
  })
  it('preserves only the exact previously approved pending compatibility identity', async () => {
    fixture({ status: 'pending' })
    expect(await patientQboActor(request())).toEqual({ memberId: OWNER, verifier: true })
    expect(await qboManager(request())).toBe(OWNER)
  })
  it.each(['inactive', 'revoked', 'suspended'])('denies an EMC membership with status %s', async status => {
    fixture({ status })
    expect(await patientQboActor(request())).toBeNull()
    await expect(qboManager(request())).rejects.toMatchObject({ status: 403 })
  })
  it.each([{ member: OTHER }, { evidence: 'not-approved' }, { user: OTHER }, { auth: OTHER }])
    ('never generalizes the pending exception: %j', async mismatch => {
      fixture({ status: 'pending', ...mismatch })
      expect(await patientQboActor(request())).toBeNull()
      await expect(qboManager(request())).rejects.toMatchObject({ status: 403 })
    })
  it('denies Stratix-only SUPERADMIN access to EMC', async () => {
    fixture({ organization: STRATIX, member: OTHER })
    expect(await patientQboActor(request())).toBeNull()
    await expect(qboManager(request())).rejects.toMatchObject({ status: 403 })
  })
  it.each(['active', 'pending'])('rejects a non-EMC header even for the %s compatibility identity', async status => {
    fixture({ status, secondMembership: true })
    expect(await patientQboActor(request(STRATIX))).toBeNull()
    await expect(qboManager(request(STRATIX))).rejects.toMatchObject({ status: 403 })
  })
  it('does not guess an organization for multiple active memberships without a header', async () => {
    fixture({ secondMembership: true })
    expect(await patientQboActor(request(null))).toBeNull()
    await expect(qboManager(request(null))).rejects.toMatchObject({ status: 409 })
  })
  it.each(['SELLER', 'SALES_MANAGER'])('preserves %s own-scope reads without QBO admin privileges', async role => {
    fixture({ role, member: OTHER })
    expect(await patientQboActor(request())).toEqual({ memberId: OTHER, verifier: false })
    await expect(qboManager(request())).rejects.toMatchObject({ status: 403, code: 'QBO_CONNECTION_FORBIDDEN' })
  })
  it('preserves Finance verification without granting connection administration', async () => {
    fixture({ role: 'FINANCE', member: OTHER })
    expect(await patientQboActor(request())).toEqual({ memberId: OTHER, verifier: true })
    await expect(qboManager(request())).rejects.toMatchObject({ status: 403 })
  })
  it('preserves existing ADMINISTRATOR connection access without extending manual verification', async () => {
    fixture({ role: 'ADMINISTRATOR', member: OTHER })
    expect(await patientQboActor(request())).toBeNull()
    expect(await qboManager(request())).toBe(OTHER)
  })
  it.each([{ profileActive: false }, { organizationActive: false }, { databaseError: true }])
    ('fails closed on invalid profile, organization, or database state: %j', async state => {
      fixture(state)
      expect(await patientQboActor(request())).toBeNull()
      await expect(qboManager(request())).rejects.toBeDefined()
    })
  it('rejects missing bearer credentials before any identity lookup', async () => {
    fixture()
    expect(await patientQboActor(request(EMC, ''))).toBeNull()
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
})
