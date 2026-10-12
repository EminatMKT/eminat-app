import { createHash } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getStratixMeetSender } from '../lib/email/sender'

export type MailMessage = { from: string; subject: string; text: string; html?: string; attachments?: { filename: string; content: string }[] }
export type MeetingMailJob = { id: string; claim_id: string; email: string; name: string; attempts: number; kind: 'created' | 'changed' | 'minutes'; payload: MailMessage | LifecyclePayload }
type LifecyclePayload = { title: string; date: string; startTime: string | null; endTime: string | null; location: string | null; inviteeNames?: string[] }
type Recipient = { name: string; email: string }
type ProviderResult = { data: { id: string } | null; error: { message: string; statusCode?: number } | null }
export type MailProvider = { send: (message: MailMessage & { to: string }, options: { idempotencyKey: string }) => Promise<ProviderResult> }

export function meetingMailDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Meeting mail storage not configured')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function enqueueMeetingMail(db: SupabaseClient, input: {
  meetingId: string; key: string; kind: 'created' | 'changed' | 'minutes'; message: MailMessage; recipients: Recipient[]
}) {
  const { data, error } = await db.rpc('enqueue_meeting_mail', {
    p_meeting_id: input.meetingId, p_key: input.key, p_kind: input.kind,
    p_payload: input.message, p_recipients: input.recipients,
  })
  if (error || typeof data !== 'string') throw new Error('Could not persist Meeting notification')
  return data
}

export function lifecycleMessage(job: MeetingMailJob): MailMessage {
  if (job.kind === 'minutes') return job.payload as MailMessage
  if ('from' in job.payload && 'subject' in job.payload && 'text' in job.payload) {
    return { from: job.payload.from, subject: job.payload.subject, text: job.payload.text }
  }
  const payload = job.payload as LifecyclePayload
  const prefix = job.kind === 'created' ? 'Convocatoria de reunión' : 'Actualización de reunión'
  return {
    from: getStratixMeetSender(), subject: prefix + ': ' + payload.title,
    text: [prefix, payload.title, 'Fecha: ' + payload.date,
      'Hora: ' + (payload.startTime?.slice(0, 5) ?? 'Sin hora') + ' – ' + (payload.endTime?.slice(0, 5) ?? 'Sin hora'),
      'Lugar: ' + (payload.location ?? 'Sin lugar'),
      'Convocados: ' + (payload.inviteeNames?.join(', ') || 'Consultar la reunión en LILLY')].join('\n'),
  }
}

export function meetingMailPolicy(env: Record<string, string | undefined> = process.env) {
  const mode = env.MEETINGS_MAIL_MODE ?? 'disabled'
  const allowed = new Set((env.MEETINGS_QA_RECIPIENTS ?? '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean))
  if (mode !== 'production' && mode !== 'qa') return { enabled: false, permits: (_email: string) => false }
  if (mode === 'qa' && !allowed.size) return { enabled: false, permits: (_email: string) => false }
  return { enabled: true, permits: (email: string) => mode === 'production' || allowed.has(email.trim().toLowerCase()) }
}

export async function processMeetingMail(options: {
  db?: SupabaseClient; provider?: MailProvider; eventId?: string; meetingId?: string
  policy?: ReturnType<typeof meetingMailPolicy>
} = {}) {
  const policy = options.policy ?? meetingMailPolicy()
  const key = process.env.RESEND_API_KEY
  if (!policy.enabled || (!options.provider && !key)) return { warning: 'Meeting email is disabled or not configured', deliveries: [] }
  const db = options.db ?? meetingMailDatabase()
  const provider = options.provider ?? new Resend(key!).emails
  const { data: jobs, error } = await db.rpc('claim_meeting_mail', {
    p_event_id: options.eventId ?? null, p_meeting_id: options.meetingId ?? null, p_limit: 50,
  })
  if (error) throw new Error('Could not claim Meeting mail outbox')
  const deliveries: { name: string; email: string; status: 'sent' | 'failed'; provider_message_id?: string; reason?: string }[] = []
  for (const job of (jobs ?? []) as MeetingMailJob[]) {
    let outcome: 'accepted' | 'retry' | 'unknown' | 'dead' = 'unknown'
    let providerId: string | null = null
    let reason: string | null = null
    if (!policy.permits(job.email)) {
      outcome = 'dead'; reason = 'Recipient outside controlled QA allowlist'
    } else {
      try {
        const result = await provider.send({ ...lifecycleMessage(job), to: job.email }, { idempotencyKey: 'lilly-meeting/' + job.id })
        if (result.error) {
          const status = result.error.statusCode ?? 400
          outcome = status === 429 || status >= 500 ? 'retry' : 'dead'
          reason = result.error.message.slice(0, 500)
        } else if (result.data?.id) {
          outcome = 'accepted'; providerId = result.data.id
        } else {
          reason = 'Provider returned no message ID; reconcile before retry'
        }
      } catch {
        reason = 'Unknown transport outcome; reconcile provider before retry'
      }
    }
    console.info(JSON.stringify({ event: 'meeting_mail_outcome', delivery_id: job.id, claim_id: job.claim_id, outcome, provider_message_id: providerId }))
    const { data: recorded, error: finishError } = await db.rpc('finish_meeting_mail', {
      p_id: job.id, p_claim_id: job.claim_id, p_outcome: outcome, p_provider_id: providerId, p_error: reason,
    })
    // Never report success unless provider acceptance AND its durable record both succeeded.
    if (finishError || !recorded) {
      deliveries.push({ name: job.name, email: job.email, status: 'failed', reason: 'Outcome not recorded: reconcile provider; do not resend blindly' })
    } else if (outcome === 'accepted') {
      deliveries.push({ name: job.name, email: job.email, status: 'sent', provider_message_id: providerId! })
    } else {
      deliveries.push({ name: job.name, email: job.email, status: 'failed', reason: reason ?? outcome })
    }
  }
  if (options.eventId) {
    const { data: persisted, error: statusError } = await db.rpc('meeting_mail_status', { p_event_id: options.eventId })
    if (statusError) throw new Error('Could not read durable Meeting mail status')
    const rows = (persisted ?? []) as { name: string; email: string; status: string; provider_message_id: string | null; error: string | null }[]
    return {
      warning: rows.some(row => row.status !== 'accepted') ? 'Meeting notifications require retry or reconciliation' : null,
      deliveries: rows.map(row => row.status === 'accepted'
        ? { name: row.name, email: row.email, status: 'sent' as const, provider_message_id: row.provider_message_id! }
        : { name: row.name, email: row.email, status: 'failed' as const, reason: row.error ?? row.status }),
    }
  }
  return { warning: deliveries.some(row => row.status === 'failed') ? 'Meeting notifications require retry or reconciliation' : null, deliveries }
}

/** Generated-at is presentation metadata; the canonical minutes identify a durable delivery event. */
export function minutesDeliveryKey(meetingId: string, canonical: object, from: string) {
  const hash = createHash('sha256').update(JSON.stringify({ canonical, from, templateVersion: 1 })).digest('hex')
  return 'minutes/' + meetingId + '/' + hash
}

