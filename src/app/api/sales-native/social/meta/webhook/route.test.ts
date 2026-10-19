import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: () => ({ rpc }) }))
import { GET, POST } from './route'

const secret = 'synthetic-only-meta-secret-12345'
const body = JSON.stringify({ object: 'page', entry: [{ id: 'qa-page',
  time: Math.floor(Date.now() / 1000), changes: [{ field: 'leadgen', value: {
    leadgen_id: 'qa-lead', form_id: 'qa-form', field_data: [{ name: 'full_name', values: ['QA Lead'] }],
  } }] }] })

describe('native Meta webhook route', () => {
  afterEach(() => { vi.unstubAllEnvs(); rpc.mockReset() })

  it('rejects unsigned delivery before database access', async () => {
    vi.stubEnv('LILLY_META_APP_SECRET', secret)
    const response = await POST(new Request('https://example.invalid/api/sales-native/social/meta/webhook',
      { method: 'POST', body }))
    expect(response.status).toBe(401)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('accepts a signed synthetic Lead Ads event without returning field data', async () => {
    vi.stubEnv('LILLY_META_APP_SECRET', secret)
    rpc.mockResolvedValue({ data: { status: 'PROCESSED', replayed: false }, error: null })
    const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
    const response = await POST(new Request('https://example.invalid/api/sales-native/social/meta/webhook',
      { method: 'POST', body, headers: { 'x-hub-signature-256': signature } }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ accepted: 1, replayed: 0, pending: 0, failed: 0 })
    expect(rpc).toHaveBeenCalledWith('native_sales_receive_social_event', expect.objectContaining({
      p_external_asset_id: 'qa-page', p_external_event_id: 'leadgen:qa-lead',
    }))
  })

  it('requires a configured private verification token', async () => {
    const response = await GET(new Request('https://example.invalid/api/sales-native/social/meta/webhook?hub.mode=subscribe'))
    expect(response.status).toBe(503)
  })
})
