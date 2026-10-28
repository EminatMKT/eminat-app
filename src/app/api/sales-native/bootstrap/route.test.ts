import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { salesAccess } from '@/server/sales-native/access'
import type { SalesActor } from '@/server/sales-native/policy'
const mocks = vi.hoisted(() => ({ actor: vi.fn(), admin: vi.fn(), rpc: vi.fn() }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: mocks.admin }))
vi.mock('@/server/sales-native/auth', async original => ({
  ...await original<typeof import('@/server/sales-native/auth')>(), resolveSalesActor: mocks.actor,
}))
import { NativeSalesAuthError } from '@/server/sales-native/auth'
import { GET } from './route'

const actor: SalesActor = { organizationId: 'authorized-org', memberId: 'verified-member',
  userId: 'verified-profile', role: 'SELLER', teamIds: ['authorized-team'] }
const request = (query = '?dashboard=1') => new Request(`https://lilly.example/api/sales-native/bootstrap${query}`, {
  headers: { Authorization: 'Bearer verified-session', 'X-Sales-Organization-Id': 'authorized-org' },
})
beforeEach(() => {
  vi.clearAllMocks()
  mocks.actor.mockResolvedValue(actor)
  mocks.admin.mockReturnValue({ rpc: mocks.rpc })
  mocks.rpc.mockImplementation(async name => ({ data: name, error: null }))
})
afterEach(() => vi.restoreAllMocks())

describe('Sales read-only request-local bootstrap', () => {
  it('resolves one actor and reuses the exact scoped RPCs and capability policy', async () => {
    const input = request()
    const response = await GET(input)
    expect(response.status).toBe(200)
    expect(mocks.actor).toHaveBeenCalledTimes(1)
    expect(mocks.actor.mock.calls[0][0]).toBe(input)
    expect(mocks.admin).toHaveBeenCalledWith({ noStore: true })
    for (const rpc of ['native_sales_directory', 'native_sales_report_summary'])
      expect(mocks.rpc).toHaveBeenCalledWith(rpc, {
        p_organization_id: actor.organizationId, p_actor_member_id: actor.memberId,
      })
    expect(await response.json()).toEqual({ access: salesAccess(actor),
      directory: 'native_sales_directory', summary: 'native_sales_report_summary' })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
  it('starts both read RPCs concurrently only after actor verification', async () => {
    let authorize!: (value: SalesActor) => void
    mocks.actor.mockReturnValue(new Promise(resolve => { authorize = resolve }))
    const complete: (() => void)[] = []
    mocks.rpc.mockImplementation(() => new Promise(resolve => {
      complete.push(() => resolve({ data: {}, error: null }))
    }))
    const pending = GET(request())
    expect(mocks.rpc).not.toHaveBeenCalled()
    authorize(actor)
    await vi.waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(2))
    complete.forEach(resolve => resolve())
    expect((await pending).status).toBe(200)
  })
  it('does not load a Dashboard summary for a different initial section', async () => {
    const response = await GET(request(''))
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
    expect(await response.json()).not.toHaveProperty('summary')
  })
  it.each([401,403,409,503])('fails closed on actor rejection (%s) without querying records', async status => {
    mocks.actor.mockRejectedValue(new NativeSalesAuthError(status, 'SALES_ACCESS_DENIED'))
    expect((await GET(request())).status).toBe(status)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it.each(['?organization=foreign', '?member=other&dashboard=1', '?role=SUPERADMIN',
    '?dashboard=0', '?dashboard=1&dashboard=1'])('rejects client scope/filter injection %s', async query => {
    expect((await GET(request(query))).status).toBe(422)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('keeps directory-level restrictions fail closed, including FINANCE restrictions', async () => {
    mocks.actor.mockResolvedValue({ ...actor, role: 'FINANCE' })
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'SALES_ACCESS_DENIED' } })
    const response = await GET(request())
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ code: 'SALES_ACCESS_DENIED' })
  })
  it('isolates summary failure without exposing database details or losing authorized navigation', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mocks.rpc.mockImplementation(async name => name === 'native_sales_directory'
      ? { data: { users: [] }, error: null }
      : { data: null, error: { code: 'XX000', message: 'private database detail' } })
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ access: salesAccess(actor), directory: { users: [] },
      summaryError: { code: 'SALES_UNAVAILABLE', status: 503 } })
  })
  it('never shares actor or response data between sequential users/organizations', async () => {
    await GET(request())
    const second = { ...actor, organizationId: 'second-org', memberId: 'second-member' }
    mocks.actor.mockResolvedValueOnce(second)
    const response = await GET(request())
    expect(mocks.actor).toHaveBeenCalledTimes(2)
    expect((await response.json()).access.organizationId).toBe('second-org')
    expect(mocks.rpc).toHaveBeenLastCalledWith('native_sales_report_summary', {
      p_organization_id: 'second-org', p_actor_member_id: 'second-member',
    })
  })
})
