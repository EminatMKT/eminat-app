import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
vi.mock('@/server/sales-native/social/lead-recovery', () => ({ recoverNativeMetaLeads: vi.fn() }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: () => ({ rpc }) }))
import { GET, POST } from './route'

const secret = 'synthetic-only-meta-secret-12345'
const body = JSON.stringify({ object: 'page', entry: [{ id: '405695562628937',
  time: Math.floor(Date.now() / 1000), changes: [{ field: 'leadgen', value: {
    leadgen_id: '123456', form_id: '612660371798285', field_data: [{ name: 'full_name', values: ['QA Lead'] }],
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

  it('accepts a signed synthetic Lead Ads event without returning field data', async () => {
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'true')
    vi.stubEnv('LILLY_META_APP_SECRET', secret)
    rpc.mockResolvedValue({ data: { status: 'PROCESSED', replayed: false }, error: null })
    const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
    const response = await POST(new Request('https://example.invalid/api/sales-native/social/meta/webhook',
      { method: 'POST', body, headers: { 'x-hub-signature-256': signature } }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ accepted: 1, replayed: 0, pending: 0, failed: 0 })
    expect(rpc).toHaveBeenCalledWith('native_sales_receive_social_event', expect.objectContaining({
      p_external_asset_id: '405695562628937', p_external_event_id: 'leadgen:123456',
    }))
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

const signed = (payload: object) => {
  const raw = JSON.stringify(payload)
  return new Request('https://example.invalid/webhook', { method: 'POST', body: raw,
    headers: { 'x-hub-signature-256': `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}` } })
}
describe('Lead Ads source rejection', () => {
  afterEach(() => { vi.unstubAllEnvs(); rpc.mockReset() })
  it.each([['999', '612660371798285'], ['405695562628937', '999'],
    ['405695562628937', '1382279963288694']])('rejects Page/form %s/%s before database access', async (page, form) => {
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'true'); vi.stubEnv('LILLY_META_APP_SECRET', secret)
    const response = await POST(signed({ object: 'page', entry: [{ id: page, time: Math.floor(Date.now()/1000),
      changes: [{ field: 'leadgen', value: { leadgen_id: '123456', form_id: form } }] }] }))
    expect(await response.json()).toMatchObject({ failed: 1, accepted: 0 })
    expect(rpc).not.toHaveBeenCalled()
  })
  it('acknowledges signed DMs without persistence', async () => {
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'true'); vi.stubEnv('LILLY_META_APP_SECRET', secret)
    const response = await POST(signed({ object: 'page', entry: [{ id: '405695562628937',
      time: Math.floor(Date.now()/1000), messaging: [{ message: { text: 'SYNTHETIC', mid: 'id' } }] }] }))
    expect(await response.json()).toEqual({ accepted: 0, replayed: 0, pending: 0, failed: 0 })
    expect(rpc).not.toHaveBeenCalled()
  })
  it('rejects oversized bodies before signature/database processing', async () => {
    vi.stubEnv('LILLY_NATIVE_SALES_ENABLED', 'true'); vi.stubEnv('LILLY_META_APP_SECRET', secret)
    expect((await POST(new Request('https://example.invalid/webhook', { method: 'POST',
      body: 'x'.repeat(1024*1024+1) }))).status).toBe(413)
    expect(rpc).not.toHaveBeenCalled()
  })
})
