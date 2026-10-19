import { afterEach, describe, expect, it, vi } from 'vitest'

const id = {
  user: '11111111-1111-4111-8111-111111111111',
  profile: '22222222-2222-4222-8222-222222222222',
  principal: '33333333-3333-4333-8333-333333333333',
  org: '44444444-4444-4444-8444-444444444444',
}
const admin = vi.hoisted(() => vi.fn())
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: admin }))
import { salesEntitlement } from './sales-entitlement'

function query(data: unknown) {
  const result = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) }
  result.select.mockReturnValue(result)
  result.eq.mockReturnValue(result)
  return result
}

afterEach(() => {
  delete process.env.ANNIE_SALES_ENABLED
  delete process.env.ANNIE_SALES_QA_ENABLED
  delete process.env.ANNIE_SALES_QA_ALLOWLIST_JSON
  vi.clearAllMocks()
})

describe('approved Sales entitlement', () => {
  it('fails closed before rollout and with malformed identities', async () => {
    expect(await salesEntitlement(id.profile, id.user)).toBeNull()
    process.env.ANNIE_SALES_ENABLED = 'true'
    expect(await salesEntitlement('bad', id.user)).toBeNull()
    expect(admin).not.toHaveBeenCalled()
  })
  it('uses only an active, exact user mapping', async () => {
    process.env.ANNIE_SALES_ENABLED = 'true'
    const mapping = { annie_principal_id: id.principal, annie_organization_id: id.org,
      empresa_codigo: null, access_kind: 'external_sales_entitlement' }
    const users = query(mapping)
    admin.mockReturnValue({ from: vi.fn().mockReturnValue(users) })
    expect(await salesEntitlement(id.profile, id.user)).toEqual(mapping)
    expect(users.eq).toHaveBeenCalledWith('lilly_usuario_id', id.profile)
    expect(users.eq).toHaveBeenCalledWith('supabase_auth_id', id.user)
    expect(users.eq).toHaveBeenCalledWith('status', 'active')
  })
  it('requires a matching active tenant for company mappings', async () => {
    process.env.ANNIE_SALES_ENABLED = 'true'
    const mapping = { annie_principal_id: id.principal, annie_organization_id: id.org,
      empresa_codigo: 'TEST', access_kind: 'company_tenant' }
    const from = vi.fn().mockReturnValueOnce(query(mapping)).mockReturnValueOnce(query(null))
    admin.mockReturnValue({ from })
    expect(await salesEntitlement(id.profile, id.user)).toBeNull()
    expect(from).toHaveBeenCalledWith('annie_sales_tenant_mappings')
  })
})
