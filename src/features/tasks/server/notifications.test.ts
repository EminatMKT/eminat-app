import { beforeEach, expect, it, vi } from 'vitest'
const { send, db, env } = vi.hoisted(() => ({
  send: vi.fn(), db: vi.fn(), env: { RESEND_API_KEY: 're_synthetic_test_key' },
}))
vi.mock('resend', () => ({ Resend: class { emails = { send } } }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: db }))
vi.mock('@/shared/db/env.server', () => ({ serverEnv: env }))
import { dispatchTaskAssignmentEmails } from './notifications'

const taskId = '22222222-2222-4222-8222-222222222222'
const recipientId = '11111111-1111-4111-8111-111111111111'
function fakeDb({ pending = [{ id: 'event-1', recipient_id: recipientId }], claim = true, email = 'test@example.com' } = {}) {
  const writes: { status: string; error?: string }[] = []
  db.mockReturnValue({ from: (table: string) => {
    if (table === 'task_email_outbox') return {
      select: () => ({ eq: () => ({ eq: async () => ({ data: pending, error: null }) }) }),
      update: (row: { status: string; error?: string }) => {
        writes.push(row)
        return { eq: () => ({ eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: claim ? { id: 'event-1' } : null }) }) }) }) }
      },
    }
    if (table === 'actividades') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: taskId, titulo: 'Private title', responsable_id: recipientId } }) }) }) }
    return { select: () => ({ eq: () => ({ single: async () => ({ data: { email, nombre: 'Alex' } }) }) }) }
  } })
  return writes
}
beforeEach(() => { vi.clearAllMocks(); env.RESEND_API_KEY = 're_synthetic_test_key'; send.mockResolvedValue({ data: { id: 'provider-1' }, error: null }) })
it('does not send when a replay cannot claim the event', async () => {
  fakeDb({ claim: false })
  await dispatchTaskAssignmentEmails(taskId)
  expect(send).not.toHaveBeenCalled()
})
it('leaves event pending without a configured provider', async () => {
  const writes = fakeDb()
  env.RESEND_API_KEY = ''
  expect((await dispatchTaskAssignmentEmails(taskId)).warning).toMatch(/pendiente/)
  expect(writes).toEqual([])
  expect(send).not.toHaveBeenCalled()
})
it('does not send when recipient email is missing', async () => {
  const writes = fakeDb({ email: '' })
  await dispatchTaskAssignmentEmails(taskId)
  expect(send).not.toHaveBeenCalled()
  expect(writes.map(x => x.status)).toEqual(['sending', 'failed'])
})
it('records provider failure without automatic resend', async () => {
  const writes = fakeDb()
  send.mockResolvedValue({ data: null, error: { message: 'provider unavailable' } })
  await dispatchTaskAssignmentEmails(taskId)
  expect(send).toHaveBeenCalledTimes(1)
  expect(writes.map(x => x.status)).toEqual(['sending', 'failed'])
})
it('sends only generic content without task title or description', async () => {
  const writes = fakeDb()
  await dispatchTaskAssignmentEmails(taskId)
  expect(send).toHaveBeenCalledTimes(1)
  expect(send.mock.calls[0][0].html).not.toContain('Private title')
  expect(writes.map(x => x.status)).toEqual(['sending', 'sent'])
})
