import { afterEach, describe, expect, it, vi } from 'vitest'

const drain = vi.hoisted(() => vi.fn(async () => ({ attempted: 2, uncertain: 0 })))
vi.mock('@/server/sales-native/patient-email-outbox', () => ({ drainPatientEmailOutbox: drain }))
import { GET } from './route'

describe('Patient Portal mail retry endpoint', () => {
  afterEach(() => { vi.unstubAllEnvs(); drain.mockClear() })

  it('rejects requests without the scheduled-job secret', async () => {
    vi.stubEnv('CRON_SECRET', 'qa-secret')
    expect((await GET(new Request('https://app.test/api/sales-native/patient-email/process'))).status).toBe(401)
    expect(drain).not.toHaveBeenCalled()
  })

  it('drains due messages only with the exact secret', async () => {
    vi.stubEnv('CRON_SECRET', 'qa-secret')
    const response = await GET(new Request('https://app.test/api/sales-native/patient-email/process', {
      headers: { Authorization: 'Bearer qa-secret' },
    }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ attempted: 2, uncertain: 0 })
    expect(drain).toHaveBeenCalledOnce()
  })
})
