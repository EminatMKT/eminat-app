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
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'true')
    vi.stubEnv('LILLY_META_APP_SECRET', secret)
    const response = await POST(new Request('https://example.invalid/api/sales-native/social/meta/webhook',
      { method: 'POST', body }))
    expect(response.status).toBe(401)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects even signed deliveries without persisting or returning field data', async () => {
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'true')
    vi.stubEnv('LILLY_META_APP_SECRET', secret)
    rpc.mockResolvedValue({ data: { status: 'PROCESSED', replayed: false }, error: null })
    const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
    const response = await POST(new Request('https://example.invalid/api/sales-native/social/meta/webhook',
      { method: 'POST', body, headers: { 'x-hub-signature-256': signature } }))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ code: 'META_INGESTION_DISABLED' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('requires a configured private verification token', async () => {
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'true')
    const response = await GET(new Request('https://example.invalid/api/sales-native/social/meta/webhook?hub.mode=subscribe'))
    expect(response.status).toBe(503)
  })

  it('keeps the webhook unavailable before controlled native Sales activation', async () => {
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'false')
    const response = await POST(new Request('https://example.invalid/api/sales-native/social/meta/webhook',
      { method: 'POST', body }))
    expect(response.status).toBe(404)
    expect(rpc).not.toHaveBeenCalled()
  })
})
