import { beforeEach, describe, expect, it, vi } from 'vitest'
const { send } = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('resend', () => ({ Resend: class { emails = { send } } }))
import { POST } from './route'

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'synthetic-cron-secret')
  vi.stubEnv('RESEND_API_KEY', 'synthetic-mail-key')
  vi.stubEnv('PATIENT_EMAIL_FROM_ADDRESS', 'sender@example.invalid')
  vi.stubEnv('LILLY_QBO_RECONCILE_ALERT_TO', 'operator@example.invalid')
  send.mockReset().mockResolvedValue({ data: { id: 'synthetic' }, error: null })
})
const request = (body: unknown, token = 'synthetic-cron-secret') => new Request('https://example.invalid/api', {
  method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body),
})
describe('QBO operational alert boundary', () => {
  it('denies unauthenticated calls before any notification', async () => {
    expect((await POST(request({ state: 'STALE', incident: 100 }, 'wrong'))).status).toBe(401)
    expect(send).not.toHaveBeenCalled()
  })
  it('uses only configured recipients, fixed content and stable incident deduplication', async () => {
    const payload = { state: 'STALE', incident: 100 }
    expect((await POST(request(payload))).status).toBe(200)
    expect(send.mock.calls[0][0].to).toBe('operator@example.invalid')
    expect(send.mock.calls[0][1]).toEqual({ idempotencyKey: 'qbo-worker-stale-100' })
    expect((await POST(request({ ...payload, to: 'other@example.invalid' }))).status).toBe(422)
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('does not report delivery on missing configuration or provider uncertainty', async () => {
    vi.stubEnv('LILLY_QBO_RECONCILE_ALERT_TO', '')
    expect((await POST(request({ state: 'TEST', incident: 100 }))).status).toBe(503)
    expect(send).not.toHaveBeenCalled()
    vi.stubEnv('LILLY_QBO_RECONCILE_ALERT_TO', 'operator@example.invalid')
    send.mockRejectedValue(new Error('unknown provider outcome'))
    expect((await POST(request({ state: 'TEST', incident: 100 }))).status).toBe(503)
  })
})
