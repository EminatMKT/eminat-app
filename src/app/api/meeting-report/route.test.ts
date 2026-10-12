import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import type { MeetingReportData } from '@/features/meet/lib/pdf/meeting-report'

type Version = { id: string; snapshot: MeetingReportData; sent_at: string | null; version: number }
type QueryResult = { data: unknown; error: { message: string } | null }
type MailEvent = { key: string; payload: Record<string, unknown>; rows: { id: string; name: string; email: string; status: string; provider_message_id: string | null; error: string | null }[] }
interface Query extends PromiseLike<QueryResult> {
  select(): Query; eq(): Query; order(): Query; limit(): Query; in(): Query
  insert(value: unknown): Query; update(value: unknown): Query
  single(): Promise<QueryResult>; maybeSingle(): Promise<QueryResult>
}

const mock = vi.hoisted(() => ({
  send: vi.fn(), fetch: vi.fn(), writes: [] as { table: string; operation: string; value: unknown }[],
  versions: [] as Version[], versionError: false, saveError: false, permission: true, owner: 'auth-creator',
  finalized: true, responsibles: [] as { id: string; nombre_display: string; email: string }[],
  topics: [] as { section: string; actividad_id?: string; title?: string; description?: string }[],
  mail: [] as MailEvent[],
}))
vi.mock('resend', () => ({ Resend: class { emails = { send: mock.send } } }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'auth-creator' } } }) },
    rpc: async (name: string, args: Record<string, unknown> = {}) => {
      if (name === 'enqueue_meeting_mail') {
        let event = mock.mail.find(e => e.key === args.p_key)
        if (!event) {
          event = { key: args.p_key as string, payload: args.p_payload as Record<string, unknown>, rows: [] }
          mock.mail.push(event)
        }
        for (const person of args.p_recipients as { name: string; email: string }[]) {
          if (!event.rows.some(row => row.email === person.email)) event.rows.push({ id: event.key + '/' + person.email, ...person, status: 'pending', provider_message_id: null, error: null })
        }
        return { data: event.key, error: null }
      }
      if (name === 'claim_meeting_mail') {
        const events = mock.mail.filter(e => !args.p_event_id || e.key === args.p_event_id)
        return { data: events.flatMap(e => e.rows.filter(row => row.status === 'pending' || row.status === 'retry').map(row => ({ ...row, claim_id: 'qa-claim', kind: 'minutes', payload: e.payload, attempts: 1 }))), error: null }
      }
      if (name === 'finish_meeting_mail') {
        const row = mock.mail.flatMap(e => e.rows).find(row => row.id === args.p_id)!
        row.status = args.p_outcome as string; row.provider_message_id = args.p_provider_id as string | null; row.error = args.p_error as string | null
        return { data: true, error: null }
      }
      if (name === 'meeting_mail_status') return { data: mock.mail.find(e => e.key === args.p_event_id)?.rows, error: null }
      return { data: mock.permission, error: null }
    },
    from: (table: string) => {
      let operation = 'read'
      let value: unknown
      let list = false
      const result = (): QueryResult => {
        if (operation !== 'read') {
          mock.writes.push({ table, operation, value })
          if (table === 'meeting_report_versions' && mock.saveError) return { data: null, error: { message: 'unavailable' } }
          if (table === 'meeting_report_versions' && operation === 'insert') mock.versions.unshift({ id: 'saved-version', ...(value as Omit<Version, 'id'>) })
          return { data: { id: 'saved-version' }, error: null }
        }
        if (table === 'usuarios') return { data: list ? mock.responsibles : { nombre_display: 'Creator', email: 'creator@example.test' }, error: null }
        if (table === 'meetings') return { data: { id: 'meeting-1', user_id: mock.owner, title: 'QA Meeting', objective: 'Review', meeting_date: '2026-10-12', start_time: '10:00', end_time: '11:00', participants: ['Attendee'], status: mock.finalized ? 'finalizada' : 'activa', empresas: { nombre: 'QA' } }, error: null }
        if (table === 'topics') return { data: mock.topics, error: null }
        if (table === 'meeting_participants') return { data: [
          { usuarios: { nombre_display: 'Attendee', email: ' ATTENDEE@example.test ' } },
          { usuarios: { nombre_display: 'Absent', email: 'absent@example.test' } },
          { usuarios: { nombre_display: 'Attendee duplicate', email: 'attendee@example.test' } },
        ], error: null }
        return { data: mock.versions, error: mock.versionError ? { message: 'unavailable' } : null }
      }
      const query: Query = {
        select: () => query, eq: () => query, order: () => query, limit: () => query,
        in: () => { list = true; return query },
        insert: (v) => { operation = 'insert'; value = v; return query },
        update: (v) => { operation = 'update'; value = v; return query },
        single: async () => result(), maybeSingle: async () => result(),
        then: (resolve, reject) => Promise.resolve(result()).then(resolve, reject),
      }
      return query
    },
  }),
}))
const request = (action = 'send') => new Request('https://qa.example.test/api/meeting-report', {
  method: 'POST', headers: { authorization: 'Bearer qa-only' },
  body: JSON.stringify({ meetingId: 'meeting-1', action }),
})
beforeEach(() => {
  vi.clearAllMocks()
  mock.writes = []; mock.versions = []; mock.topics = []; mock.responsibles = []; mock.mail = []
  mock.versionError = false; mock.saveError = false; mock.permission = true
  mock.owner = 'auth-creator'; mock.finalized = true
  vi.stubEnv('RESEND_API_KEY', 're_qa_never_sent')
  vi.stubEnv('SUPABASE_SECRET_KEY', 'dummy-qa-only')
  vi.stubEnv('MEETINGS_MAIL_MODE', 'qa')
  vi.stubEnv('MEETINGS_QA_RECIPIENTS', 'attendee@example.test,absent@example.test,creator@example.test,owner@example.test,collaborator@example.test')
  vi.stubGlobal('fetch', mock.fetch)
  mock.send.mockResolvedValue({ data: { id: 'provider-qa-id' }, error: null })
})
describe('Meeting minutes recipient policy and delivery safeguards (no external sends)', () => {
  it('sends the correct PDF to absent invitees, attendees and the creator once each', async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mock.send.mock.calls.map(([payload]) => payload.to)).toEqual(['attendee@example.test', 'absent@example.test', 'creator@example.test'])
    for (const [payload] of mock.send.mock.calls) {
      expect(payload.subject).toContain('QA Meeting')
      expect(payload.attachments[0].filename).toBe('acta-meeting-1.pdf')
      const pdf = Buffer.from(payload.attachments[0].content, 'base64').toString()
      expect(pdf).toContain('%PDF-')
      expect(pdf).toContain('meeting-1')
      expect(pdf).toContain('Absent')
    }
    const event = mock.writes.find(w => w.table === 'meeting_events')!
    const events = event.value as { metadata: { accepted: { provider_message_id: string }[] } }[]
    expect(events.at(-1)!.metadata.accepted[0].provider_message_id).toBe('provider-qa-id')
  })
  it('resolves all canonical Task assignees under caller RLS, including non-invitees', async () => {
    mock.topics = [{ section: 'proximos_pasos', actividad_id: 'task-1' }]
    mock.responsibles = [{ id: 'owner-1', nombre_display: 'Task owner', email: 'owner@example.test' }, { id: 'owner-2', nombre_display: 'Collaborator', email: 'collaborator@example.test' }]
    mock.fetch.mockResolvedValue(new Response(JSON.stringify({ task: { id: 'task-1', titulo: 'QA Task', estado: 'Pendiente', responsable: { id: 'owner-1', nombre: 'Task owner' }, responsables: [{ id: 'owner-1', nombre: 'Task owner' }, { id: 'owner-2', nombre: 'Collaborator' }] } }), { status: 200 }))
    expect((await POST(request())).status).toBe(200)
    expect(mock.send.mock.calls.map(([p]) => p.to)).toContain('collaborator@example.test')
    expect(Buffer.from(mock.send.mock.calls[0][0].attachments[0].content, 'base64').toString()).toContain('QA Task')
    expect(Buffer.from(mock.send.mock.calls[0][0].attachments[0].content, 'base64').toString()).toContain('Task owner, Collaborator')
    expect(mock.fetch.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer qa-only' })
  })
  it('rejects a mismatched canonical Task without emailing or changing data', async () => {
    mock.topics = [{ section: 'proximos_pasos', actividad_id: 'task-1' }]
    mock.fetch.mockResolvedValue(new Response(JSON.stringify({ task: { id: 'wrong-task' } })))
    expect((await POST(request())).status).toBe(502)
    expect(mock.send).not.toHaveBeenCalled()
    expect(mock.writes).toHaveLength(0)
  })
  it('fails closed when an assignee email profile is outside the caller scope', async () => {
    mock.topics = [{ section: 'proximos_pasos', actividad_id: 'task-1' }]
    mock.fetch.mockResolvedValue(new Response(JSON.stringify({ task: { id: 'task-1', responsable: { id: 'unavailable', nombre: 'Outside scope' } } })))
    expect((await POST(request())).status).toBe(502)
    expect(mock.send).not.toHaveBeenCalled()
    expect(mock.writes).toHaveLength(0)
  })
  it('changes the provider key when canonical content changes independently of the Meeting timestamp', async () => {
    expect((await POST(request())).status).toBe(200)
    const firstKey = mock.send.mock.calls[0][1].idempotencyKey
    mock.send.mockClear()
    mock.topics = [{ section: 'resumen', title: 'New conclusion', description: 'Changed' }]
    expect((await POST(request())).status).toBe(200)
    expect(mock.send.mock.calls[0][1].idempotencyKey).not.toBe(firstKey)
  })
  it.each(['permission', 'owner', 'finalized'])('keeps the existing authorization/finalization gate: %s', async (gate) => {
    if (gate === 'permission') mock.permission = false
    if (gate === 'owner') mock.owner = 'different-owner'
    if (gate === 'finalized') mock.finalized = false
    expect((await POST(request())).status).toBe(gate === 'finalized' ? 409 : 403)
    expect(mock.send).not.toHaveBeenCalled()
    expect(mock.writes).toHaveLength(0)
  })
  it.each(['read', 'save'])('does not send when the version %s fails', async (failure) => {
    mock.versionError = failure === 'read'; mock.saveError = failure === 'save'
    expect((await POST(request())).status).toBe(500)
    expect(mock.send).not.toHaveBeenCalled()
  })
  it('reuses the same PDF and provider key after a partial send', async () => {
    mock.send.mockResolvedValueOnce({ data: { id: 'accepted' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'try later', statusCode: 503 } })
      .mockResolvedValueOnce({ data: { id: 'accepted-creator' }, error: null })
    expect((await POST(request())).status).toBe(502)
    mock.versions[0].sent_at = '2026-10-12T10:00:00Z'
    const original = mock.send.mock.calls.map(([p, options]) => ({ attachment: p.attachments, key: options.idempotencyKey }))
    mock.send.mockClear()
    expect((await POST(request())).status).toBe(200)
    expect(mock.send.mock.calls.map(([p, options]) => ({ attachment: p.attachments, key: options.idempotencyKey }))).toEqual([original[1]])
    expect(mock.writes.filter(w => w.table === 'meeting_report_versions' && w.operation === 'insert')).toHaveLength(1)
  })
  it('fails instead of claiming acceptance if the provider returns no message ID', async () => {
    mock.send.mockResolvedValue({ data: null, error: null })
    expect((await POST(request())).status).toBe(502)
  })
})

