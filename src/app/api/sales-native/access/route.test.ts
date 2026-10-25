import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ actor: vi.fn(), organizations: vi.fn() }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: vi.fn() }))
vi.mock('@/server/sales-native/auth', async importOriginal => {
  const actual = await importOriginal<typeof import('@/server/sales-native/auth')>()
  return { ...actual, resolveSalesActor: mocks.actor, resolveSalesOrganizations: mocks.organizations }
})
import { NativeSalesAuthError } from '@/server/sales-native/auth'
import { GET } from './route'

beforeEach(() => { vi.clearAllMocks() })
describe('Sales organization discovery without capability aggregation', () => {
  it('keeps navigation available for an authorized multi-organization login', async () => {
    mocks.actor.mockRejectedValue(new NativeSalesAuthError(409, 'SALES_ORGANIZATION_REQUIRED'))
    const organizations = [{ organizationId: 'emc', name: 'EMC', role: 'SUPERADMIN' }]
    mocks.organizations.mockResolvedValue(organizations)
    const response = await GET(new Request('https://lilly.example/api/sales-native/access'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ allowed: true, organizationRequired: true, organizations })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
  it('does not turn a forbidden organization into discovery access', async () => {
    mocks.actor.mockRejectedValue(new NativeSalesAuthError(403, 'SALES_ACCESS_DENIED'))
    const response = await GET(new Request('https://lilly.example/api/sales-native/access', {
      headers: { 'X-Sales-Organization-Id': 'unauthorized' },
    }))
    expect(response.status).toBe(403)
    expect(mocks.organizations).not.toHaveBeenCalled()
  })
  it('does not swallow identity or database failures', async () => {
    mocks.actor.mockRejectedValue(new NativeSalesAuthError(503, 'SALES_IDENTITY_UNAVAILABLE'))
    expect((await GET(new Request('https://lilly.example/api/sales-native/access'))).status).toBe(503)
    expect(mocks.organizations).not.toHaveBeenCalled()
  })
})
