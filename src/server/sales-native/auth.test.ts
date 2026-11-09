import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ids = {
  auth: '11111111-1111-4111-8111-111111111111',
  profile: '22222222-2222-4222-8222-222222222222',
  member: '33333333-3333-4333-8333-333333333333',
  organization: '44444444-4444-4444-8444-444444444444',
  team: '55555555-5555-4555-8555-555555555555',
}
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), admin: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: mocks.admin }))

import { resolveSalesActor, resolveSalesOrganizations } from './auth'

function query(data: unknown, terminal: 'limit' | 'maybeSingle' | 'then' = 'maybeSingle') {
  const result = { data, error: null }
  const chain = { select: vi.fn(), eq: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn() }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.limit.mockResolvedValue(result)
  chain.maybeSingle.mockResolvedValue(result)
  if (terminal === 'then') return Object.assign(chain, {
    then: (resolve: (value: typeof result) => void) => resolve(result),
  })
  return chain
}

const request = (organizationId?: string) => new Request('https://lilly.example/api/sales-native/access', {
  headers: { Authorization: 'Bearer local-supabase-session',
    ...(organizationId ? { 'X-Sales-Organization-Id': organizationId } : {}) },
})

function fixture(options: { members?: unknown[]; organization?: unknown; profile?: unknown } = {}) {
  const profile = query(options.profile === undefined ? { id: ids.profile } : options.profile)
  const members = query(options.members === undefined ? [{ id: ids.member,
    organization_id: ids.organization, user_id: ids.profile, role: 'SELLER' }] : options.members, 'limit')
  const organization = query(options.organization === undefined ? { id: ids.organization } : options.organization)
  const teams = query([{ team_id: ids.team }], 'then')
  const byTable = { usuarios: profile, sales_members: members,
    sales_organizations: organization, sales_team_members: teams }
  const from = vi.fn((name: keyof typeof byTable) => byTable[name])
  mocks.admin.mockReturnValue({ from })
  return { from, profile, members, organization, teams }
}

beforeEach(() => {
  vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'true')
  mocks.createClient.mockReturnValue({ auth: { getUser: vi.fn().mockResolvedValue({
    data: { user: { id: ids.auth } }, error: null,
  }) } })
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('native Sales session boundary', () => {
  it('denies access before native Sales activation without querying identity', async () => {
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', '')
    await expect(resolveSalesActor(request())).rejects.toMatchObject({
      status: 404, code: 'SALES_NOT_ACTIVE',
    })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('requires an active LILLY profile and never falls back to ANNIE identity', async () => {
    const { from } = fixture({ profile: null })
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(resolveSalesActor(request())).rejects.toMatchObject({
      status: 403, code: 'SALES_ACCESS_DENIED',
    })
    expect(from).not.toHaveBeenCalledWith('sales_members')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('excludes historical, non-login members from authentication', async () => {
    const { members } = fixture({ members: [] })
    await expect(resolveSalesActor(request())).rejects.toMatchObject({
      status: 403, code: 'SALES_ACCESS_DENIED',
    })
    expect(members.eq).toHaveBeenCalledWith('auth_id', ids.auth)
    expect(members.eq).toHaveBeenCalledWith('user_id', ids.profile)
    expect(members.eq).toHaveBeenCalledWith('status', 'active')
  })

  it('denies an active member while the imported organization is pending', async () => {
    const { organization } = fixture({ organization: null })
    await expect(resolveSalesActor(request())).rejects.toMatchObject({
      status: 403, code: 'SALES_ACCESS_DENIED',
    })
    expect(organization.eq).toHaveBeenCalledWith('status', 'active')
  })

  it('requires an explicit organization when a login has multiple active memberships', async () => {
    fixture({ members: [{ id: ids.member }, { id: ids.member }] })
    await expect(resolveSalesActor(request())).rejects.toMatchObject({
      status: 409, code: 'SALES_ORGANIZATION_REQUIRED',
    })
  })

  it('resolves only the exact active LILLY member and team scope', async () => {
    const { members } = fixture()
    expect(await resolveSalesActor(request(ids.organization))).toEqual({
      organizationId: ids.organization, memberId: ids.member, userId: ids.profile,
      role: 'SELLER', teamIds: [ids.team],
    })
    expect(members.eq).toHaveBeenCalledWith('organization_id', ids.organization)
  })

  it('discovers only active memberships in active organizations for the exact login', async () => {
    const { members } = fixture({ members: [{ organization_id: ids.organization, role: 'SUPERADMIN',
      sales_organizations: [{ id: ids.organization, name: 'EMC', code: 'emc', status: 'active' }] }] })
    expect(await resolveSalesOrganizations(request())).toEqual([
      { organizationId: ids.organization, name: 'EMC', code: 'emc', role: 'SUPERADMIN' },
    ])
    expect(members.eq).toHaveBeenCalledWith('auth_id', ids.auth)
    expect(members.eq).toHaveBeenCalledWith('user_id', ids.profile)
    expect(members.eq).toHaveBeenCalledWith('status', 'active')
    expect(members.eq).toHaveBeenCalledWith('sales_organizations.status', 'active')
  })

  it('does not turn a pending-only login into organization access', async () => {
    fixture({ members: [] })
    await expect(resolveSalesOrganizations(request())).rejects.toMatchObject({
      status: 403, code: 'SALES_ACCESS_DENIED',
    })
  })

  it('fails closed on an invalid organization relationship', async () => {
    fixture({ members: [{ organization_id: ids.organization, role: 'SUPERADMIN',
      sales_organizations: [] }] })
    await expect(resolveSalesOrganizations(request())).rejects.toMatchObject({
      status: 503, code: 'SALES_IDENTITY_INVALID',
    })
  })

  it('rejects selecting an organization with no active membership, including for SUPERADMIN', async () => {
    const { members } = fixture({ members: [] })
    await expect(resolveSalesActor(request(ids.organization))).rejects.toMatchObject({
      status: 403, code: 'SALES_ACCESS_DENIED',
    })
    expect(members.eq).toHaveBeenCalledWith('organization_id', ids.organization)
  })
})
