import { afterEach,describe,expect,it,vi } from 'vitest'

const { reconcileQboEvents } = vi.hoisted(() => ({
  reconcileQboEvents:vi.fn(async () => ({ processed:1,retry:0,ignored:0 })),
}))
vi.mock('@/server/sales-native/quickbooks/reconcile-worker',() => ({ reconcileQboEvents }))
import { GET } from './route'

const request = (authorization?: string) => new Request(
  'https://app.stratixsolutions.us/api/sales-native/quickbooks/reconcile',
  { headers:authorization ? { authorization } : {} })

describe('QBO reconciliation cron boundary',() => {
  afterEach(() => { vi.unstubAllEnvs();vi.clearAllMocks() })
  it('never reads financial evidence without cron authentication',async () => {
    vi.stubEnv('CRON_SECRET','qa-secret')
    vi.stubEnv('LILLY_QBO_OAUTH_ENABLED','true')
    expect((await GET(request())).status).toBe(401)
    expect(reconcileQboEvents).not.toHaveBeenCalled()
  })
  it('remains off while Production OAuth is disabled',async () => {
    vi.stubEnv('CRON_SECRET','qa-secret')
    vi.stubEnv('LILLY_QBO_OAUTH_ENABLED','false')
    expect((await GET(request('Bearer qa-secret'))).status).toBe(503)
    expect(reconcileQboEvents).not.toHaveBeenCalled()
  })
  it('runs only with the existing cron secret after enablement',async () => {
    vi.stubEnv('CRON_SECRET','qa-secret')
    vi.stubEnv('LILLY_QBO_OAUTH_ENABLED','true')
    expect((await GET(request('Bearer qa-secret'))).status).toBe(200)
    expect(reconcileQboEvents).toHaveBeenCalledOnce()
  })
})
