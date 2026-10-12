import { beforeEach, expect, it, vi } from 'vitest'
import { GET, POST } from './route'
const mock = vi.hoisted(() => ({ process: vi.fn(), owner: 'actor', permission: true, active: true, signed: true }))
vi.mock('@/features/meet/server/mail-outbox', () => ({ processMeetingMail: mock.process }))
vi.mock('@/features/meet/server/mail-reconciliation', () => ({ reconcileMeetingNotifications: async () => ({ warning: null, checked: 0 }) }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({
  auth: { getUser: async () => ({ data: { user: mock.signed ? { id: 'actor' } : null }, error: null }) },
  rpc: async () => ({ data: mock.permission, error: null }),
  from: (table: string) => {
    const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: table === 'meetings' ? { user_id: mock.owner } : mock.active ? { id: 'profile' } : null, error: null }) }
    return q
  },
}) }))
beforeEach(() => { vi.clearAllMocks(); mock.owner = 'actor'; mock.permission = true; mock.active = true; mock.signed = true; vi.stubEnv('CRON_SECRET', 'qa-secret'); mock.process.mockResolvedValue({ warning: null, deliveries: [] }) })
const request = (token = 'session') => new Request('https://qa.example.test/api/meetings/notifications/process', {
 method: 'POST', headers: token ? { authorization: 'Bearer ' + token } : {},
 body: JSON.stringify({ meetingId: '11111111-1111-4111-8111-111111111111' }),
})
it('blocks cron without the exact secret', async () => {
 expect((await GET(new Request('https://qa.example.test'))).status).toBe(401)
 expect(mock.process).not.toHaveBeenCalled()
})
it('allows the protected cron to drain jobs', async () => {
 expect((await GET(new Request('https://qa.example.test', { headers: { authorization: 'Bearer qa-secret' } }))).status).toBe(200)
 expect(mock.process).toHaveBeenCalledWith()
})
it('requires a configured cron secret', async () => {
 vi.stubEnv('CRON_SECRET', '')
 expect((await GET(new Request('https://qa.example.test'))).status).toBe(503)
})
it.each(['owner', 'module', 'active', 'session'])('does not flush another scope: %s', async gate => {
 if (gate === 'owner') mock.owner = 'someone-else'
 if (gate === 'module') mock.permission = false
 if (gate === 'active') mock.active = false
 if (gate === 'session') mock.signed = false
 expect((await POST(request())).status).toBe(gate === 'session' ? 401 : 403)
 expect(mock.process).not.toHaveBeenCalled()
})
it('flushes only the Meeting owned by the active caller', async () => {
 expect((await POST(request())).status).toBe(200)
 expect(mock.process).toHaveBeenCalledWith({ meetingId: '11111111-1111-4111-8111-111111111111' })
})
it('does not claim queued mail as delivered when processing is disabled', async () => {
 mock.process.mockResolvedValue({ warning: 'disabled', deliveries: [] })
 expect((await POST(request())).status).toBe(202)
})

