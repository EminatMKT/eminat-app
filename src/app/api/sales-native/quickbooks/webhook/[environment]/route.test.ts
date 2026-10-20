import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

const insert = vi.fn()
const from = vi.fn((table: string) => table === 'sales_qbo_connections'
  ? { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({
      maybeSingle: async () => ({ data: { organization_id: 'org-qa' }, error: null }),
    }) }) }) }) }
  : { insert })
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: () => ({ from }) }))
vi.mock('server-only', () => ({}))
import { POST } from './route'

const verifier = 'synthetic-verifier-only'
const body = JSON.stringify({ eventNotifications: [{ realmId: '123', dataChangeEvent: {
  entities: [{ name: 'Invoice', id: '42', operation: 'Update',
    lastUpdated: '2026-10-19T00:00:00Z' }],
} }] })
const request = (signature: string) => new Request(
  'https://app.stratixsolutions.us/api/sales-native/quickbooks/webhook/sandbox',
  { method: 'POST', body, headers: { 'intuit-signature': signature } })

describe('Native Sales QuickBooks webhook boundary', () => {
  afterEach(() => { vi.clearAllMocks(); delete process.env.LILLY_QBO_SANDBOX_WEBHOOK_VERIFIER })

  it('rejects unsigned accounting events before touching persistence', async () => {
    process.env.LILLY_QBO_SANDBOX_WEBHOOK_VERIFIER = verifier
    const response = await POST(request('invalid'), { params: { environment: 'sandbox' } })
    expect(response.status).toBe(401)
    expect(from).not.toHaveBeenCalled()
  })

  it('accepts a signed event and treats a duplicate as idempotent', async () => {
    process.env.LILLY_QBO_SANDBOX_WEBHOOK_VERIFIER = verifier
    insert.mockResolvedValue({ error: { code: '23505' } })
    const signature = createHmac('sha256', verifier).update(body).digest('base64')
    const response = await POST(request(signature), { params: { environment: 'sandbox' } })
    expect(response.status).toBe(200)
    expect(insert).toHaveBeenCalledOnce()
    expect(insert.mock.calls[0][0]).toMatchObject({ environment: 'sandbox', realm_id: '123',
      entity_type: 'Invoice', entity_id: '42' })
  })
})
