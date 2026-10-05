import { beforeEach, expect, it, vi } from 'vitest'

const { send, db, env } = vi.hoisted(() => ({
  send: vi.fn(), db: vi.fn(),
  env: { RESEND_API_KEY: 're_synthetic_test_key', TASKS_PUBLIC_URL: 'https://preview.example/tasks', TASK_NOTIFY_FROM_EMAIL: undefined as string | undefined },
}))
vi.mock('resend', () => ({ Resend: class { emails = { send } } }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: db }))
vi.mock('@/shared/db/env.server', () => ({ serverEnv: env }))
import dispatchTaskAssignmentEmails from '.'

const taskId = '22222222-2222-4222-8222-222222222222'
const recipientId = '11111111-1111-4111-8111-111111111111'
const event = { id: '33333333-3333-4333-8333-333333333333', activity_id: taskId, recipient_id: recipientId, event: 'created', attempts: 1 }

function fakeDb(options: { events?: typeof event[]; assignee?: string; email?: string; dbError?: boolean; latestId?: string; assignmentLeader?: boolean; assignmentExists?: boolean } = {}) {
  const writes: { status?: string; error?: string; next_attempt_at?: string | null }[] = []
  const rpc = vi.fn().mockResolvedValue({ data: options.events ?? [event], error: options.dbError ? { message: 'db' } : null })
  // The recipient is "still assigned" (an actividad_responsables row exists for them) unless
  // `assignee` names someone else — same semantic the old `responsable_id` column check had.
  const stillAssigned = options.assignmentExists ?? (options.assignee ?? recipientId) === recipientId
  db.mockReturnValue({
    rpc,
    from: (table: string) => {
      if (table === 'task_email_outbox') return {
        update: (row: typeof writes[number]) => ({ eq: async () => {
          writes.push(row)
          return { error: null }
        } }),
        select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { id: options.latestId ?? event.id }, error: null }) }) }) }) }) }),
      }
      if (table === 'actividad_responsables') return {
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () =>
          ({ data: stillAssigned ? { es_lider: options.assignmentLeader !== false } : null, error: null }) }) }) }),
      }
      const data = table === 'actividades'
        ? { id: taskId, titulo: 'Create launch', empresa: 'Marketing', fecha_entrega: '2026-10-10', responsable_id: options.assignee ?? recipientId }
        : { id: recipientId, email: options.email === undefined ? 'alex@example.com' : options.email, nombre_display: 'Alex', activo: true }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data, error: null }) }) }) }
    },
  })
  return { writes, rpc }
}
beforeEach(() => { vi.clearAllMocks(); env.RESEND_API_KEY = 're_synthetic_test_key'; send.mockResolvedValue({ data: { id: 'provider-1' }, error: null }) })

it('claims once and sends only the recipient with a stable provider idempotency key', async () => {
  const { writes, rpc } = fakeDb()
  await dispatchTaskAssignmentEmails(taskId)
  expect(rpc).toHaveBeenCalledWith('claim_task_assignment_emails', { p_activity_id: taskId, p_limit: 50 })
  expect(send).toHaveBeenCalledTimes(1)
  expect(send.mock.calls[0][0].to).toBe('alex@example.com')
  expect(send.mock.calls[0][1]).toEqual({ idempotencyKey: `lilly-assignment-${event.id}` })
  expect(send.mock.calls[0][0].html).toContain('Create launch')
  expect(send.mock.calls[0][0].html).not.toContain('descripción')
  expect(send.mock.calls[0][0].html).toContain('https://preview.example/tasks')
  expect(writes.map(row => row.status)).toEqual(['sent'])
})
it('does not claim or send without Resend configuration', async () => {
  const { rpc } = fakeDb()
  env.RESEND_API_KEY = ''
  expect((await dispatchTaskAssignmentEmails()).warning).toMatch(/pendiente/)
  expect(rpc).not.toHaveBeenCalled()
  expect(send).not.toHaveBeenCalled()
})
it('does not send an older assignment after reassignment', async () => {
  const { writes } = fakeDb({ assignee: '44444444-4444-4444-8444-444444444444' })
  await dispatchTaskAssignmentEmails()
  expect(send).not.toHaveBeenCalled()
  expect(writes).toMatchObject([{ status: 'failed', next_attempt_at: null }])
})
it('does not send an older event when an assignee returns to the same task', async () => {
  const { writes } = fakeDb({ latestId: 'newer-event' })
  await dispatchTaskAssignmentEmails()
  expect(send).not.toHaveBeenCalled()
  expect(writes).toMatchObject([{ status: 'failed', next_attempt_at: null }])
})
it('does not send if recipient email is missing', async () => {
  const { writes } = fakeDb({ email: '' })
  await dispatchTaskAssignmentEmails()
  expect(send).not.toHaveBeenCalled()
  expect(writes).toMatchObject([{ status: 'failed', next_attempt_at: null }])
})
it('retries explicit provider errors and keeps the same idempotency key', async () => {
  const { writes } = fakeDb()
  send.mockResolvedValue({ data: null, error: { message: 'rate limited' } })
  await dispatchTaskAssignmentEmails()
  expect(writes[0].status).toBe('failed')
  expect(writes[0].next_attempt_at).toBeTruthy()
  expect(send.mock.calls[0][1]).toEqual({ idempotencyKey: `lilly-assignment-${event.id}` })
})
it('leaves uncertain transport outcomes in sending for reconciliation', async () => {
  const { writes } = fakeDb()
  send.mockRejectedValue(new Error('network timeout'))
  await dispatchTaskAssignmentEmails()
  expect(writes).toEqual([{ error: 'network timeout' }])
})
it('does not send when there are no claimable events', async () => {
  fakeDb({ events: [] })
  await dispatchTaskAssignmentEmails()
  expect(send).not.toHaveBeenCalled()
})
it('sends a new collaborator through the same outbox', async () => {
  fakeDb({ events: [{ ...event, event: 'collaborator_added' }], assignee: '44444444-4444-4444-8444-444444444444', assignmentLeader: false, assignmentExists: true })
  await dispatchTaskAssignmentEmails(taskId)
  expect(send).toHaveBeenCalledTimes(1)
})
it('cancels a pending email after the collaborator is removed', async () => {
  const { writes } = fakeDb({ events: [{ ...event, event: 'collaborator_added' }], assignee: '44444444-4444-4444-8444-444444444444' })
  await dispatchTaskAssignmentEmails(taskId)
  expect(send).not.toHaveBeenCalled()
  expect(writes).toMatchObject([{ status: 'failed', next_attempt_at: null }])
})
