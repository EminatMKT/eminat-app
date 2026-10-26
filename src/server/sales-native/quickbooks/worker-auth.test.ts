import { afterEach, describe, expect, it, vi } from 'vitest'
import { workerAuthorized } from './worker-auth'

afterEach(() => vi.unstubAllEnvs())
describe('least privilege QBO scheduler authorization', () => {
  it('accepts the dedicated worker and preserves the existing cron only where explicitly allowed', () => {
    vi.stubEnv('LILLY_QBO_RECONCILE_WORKER_SECRET', 'dedicated-test-key')
    vi.stubEnv('CRON_SECRET', 'legacy-test-key')
    const request = (token: string) => new Request('https://example.invalid', {
      headers: { authorization: `Bearer ${token}` },
    })
    expect(workerAuthorized(request('dedicated-test-key'))).toBe(true)
    expect(workerAuthorized(request('legacy-test-key'))).toBe(false)
    expect(workerAuthorized(request('legacy-test-key'), true)).toBe(true)
    expect(workerAuthorized(request('wrong'), true)).toBe(false)
    vi.stubEnv('LILLY_QBO_RECONCILE_WORKER_SECRET', '')
    vi.stubEnv('CRON_SECRET', '')
    expect(workerAuthorized(request(''), true)).toBe(false)
  })
})
