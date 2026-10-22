import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { sendPatientEmail, type PatientEmailRequest } from './patient-email-delivery'

type OutboxRow = {
  id: string
  kind: PatientEmailRequest['kind']
  event_id: string
  recipient: string
  payload_ciphertext: string
  status: 'QUEUED' | 'SENDING' | 'RETRY' | 'SENT' | 'FAILED' | 'UNKNOWN'
}

function encryptionKey() {
  const encoded = process.env.PATIENT_EMAIL_OUTBOX_KEY ?? ''
  if (!/^[A-Za-z0-9+/]{43}=$/.test(encoded)) return null
  const key = Buffer.from(encoded, 'base64')
  return key.length === 32 ? key : null
}

function encrypt(content: PatientEmailRequest['content'], key: Buffer) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(content), 'utf8'), cipher.final()])
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${data.toString('base64url')}`
}

function decrypt(value: string, key: Buffer): PatientEmailRequest['content'] {
  const [version, iv, tag, data, extra] = value.split('.')
  if (version !== 'v1' || !iv || !tag || !data || extra) throw new Error('PATIENT_EMAIL_PAYLOAD_INVALID')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  const decoded = JSON.parse(Buffer.concat([
    decipher.update(Buffer.from(data, 'base64url')), decipher.final(),
  ]).toString('utf8')) as PatientEmailRequest['content']
  if (!decoded || typeof decoded.title !== 'string' || typeof decoded.message !== 'string' ||
    typeof decoded.actionLabel !== 'string' || typeof decoded.actionUrl !== 'string')
    throw new Error('PATIENT_EMAIL_PAYLOAD_INVALID')
  return decoded
}

/** No recipient, link, token, or provider response is written to application logs. */
export async function queuePatientEmail(message: PatientEmailRequest) {
  const key = encryptionKey()
  if (!key) return { status: 'NOT_CONFIGURED' as const }
  const recipient = message.recipient.trim().toLowerCase()
  const hash = createHash('sha256').update(JSON.stringify({
    kind: message.kind, eventId: message.eventId, recipient, content: message.content,
  })).digest('hex')
  try {
    const db = supabaseAdmin({ noStore: true })
    const { data, error } = await db.rpc('native_sales_patient_email_queue', {
      p_kind: message.kind, p_event_id: message.eventId, p_recipient: recipient,
      p_payload_hash: hash, p_payload_ciphertext: encrypt(message.content, key),
    })
    if (error || !data?.id) return { status: 'FAILED' as const }
    const row = data as OutboxRow
    if (row.status === 'SENT') return { status: 'SENT' as const }
    if (row.status === 'UNKNOWN' || row.status === 'FAILED') return { status: row.status }
    return deliverPatientEmail(row.id)
  } catch {
    // The provider was not called unless an outbox row was successfully claimed.
    // Do not allow an email infrastructure failure to corrupt the business response.
    return { status: 'FAILED' as const }
  }
}

export async function deliverPatientEmail(id: string) {
  let row: OutboxRow
  let db: ReturnType<typeof supabaseAdmin>
  try {
    db = supabaseAdmin({ noStore: true })
    const { data, error } = await db.rpc('native_sales_patient_email_claim', { p_id: id })
    if (error) return { status: 'FAILED' as const }
    if (!data?.id) return { status: 'QUEUED' as const }
    row = data as OutboxRow
  } catch { return { status: 'FAILED' as const } }
  const key = encryptionKey()
  let result: Awaited<ReturnType<typeof sendPatientEmail>>
  if (!key) result = { status: 'NOT_CONFIGURED' }
  else {
    try {
      result = await sendPatientEmail({ kind: row.kind, eventId: row.event_id,
        recipient: row.recipient, content: decrypt(row.payload_ciphertext, key) })
    } catch {
      result = { status: 'UNKNOWN' }
    }
  }
  const outcome = result.status === 'SENT' ? 'SENT' : result.status === 'UNKNOWN' ? 'UNKNOWN' : 'FAILED'
  try {
    const { data: finished, error: finishError } = await db.rpc('native_sales_patient_email_finish', {
      p_id: row.id, p_outcome: outcome,
      p_provider_id: result.status === 'SENT' ? result.providerId : null,
    })
    if (finishError || !finished) return { status: 'UNKNOWN' as const }
    return { status: finished as OutboxRow['status'] }
  } catch { return { status: 'UNKNOWN' as const } }
}

export async function drainPatientEmailOutbox() {
  const db = supabaseAdmin({ noStore: true })
  const recovered = await db.rpc('native_sales_patient_email_recover_unknown')
  if (recovered.error) throw new Error('PATIENT_EMAIL_OUTBOX_UNAVAILABLE')
  const { data, error } = await db.from('sales_patient_email_outbox').select('id')
    .in('status', ['QUEUED', 'RETRY']).lte('next_attempt_at', new Date().toISOString())
    .order('next_attempt_at', { ascending: true }).limit(20)
  if (error) throw new Error('PATIENT_EMAIL_OUTBOX_UNAVAILABLE')
  for (const row of data ?? []) await deliverPatientEmail(row.id)
  return { attempted: data?.length ?? 0, uncertain: recovered.data ?? 0 }
}
