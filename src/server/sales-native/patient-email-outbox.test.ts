import { beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>(),
  queueArgs: [] as Array<Record<string, unknown>>,
  sends: [] as Array<Record<string, unknown>>,
  outcome: 'SENT' as 'SENT' | 'FAILED' | 'UNKNOWN',
  outcomes: [] as Array<'SENT' | 'FAILED' | 'UNKNOWN'>,
}))

vi.mock('@/shared/db/supabaseAdmin', () => ({
  supabaseAdmin: () => ({
    rpc: async (name: string, args?: Record<string, unknown>) => {
      if (name === 'native_sales_patient_email_queue') {
        mock.queueArgs.push(args ?? {})
        const key = `${args?.p_kind}:${args?.p_event_id}`
        const existing = mock.rows.get(key)
        if (existing) return { data: existing, error: null }
        const row = { id: '11111111-1111-4111-8111-111111111111', status: 'QUEUED',
          kind: args?.p_kind, event_id: args?.p_event_id,
          recipient: args?.p_recipient, payload_ciphertext: args?.p_payload_ciphertext }
        mock.rows.set(key, row)
        return { data: row, error: null }
      }
      if (name === 'native_sales_patient_email_claim') {
        const row = Array.from(mock.rows.values()).find(item => item.id === args?.p_id)
        if (!row || !['QUEUED', 'RETRY'].includes(String(row.status))) return { data: null, error: null }
        row.status = 'SENDING'
        return { data: row, error: null }
      }
      if (name === 'native_sales_patient_email_finish') {
        const row = Array.from(mock.rows.values()).find(item => item.id === args?.p_id)
        if (!row) return { data: null, error: { code: 'NO_ROW' } }
        row.status = args?.p_outcome === 'FAILED' ? 'RETRY' : args?.p_outcome
        return { data: row.status, error: null }
      }
      return { data: null, error: { code: 'UNKNOWN_RPC' } }
    },
  }),
}))
vi.mock('./patient-email-delivery', () => ({
  sendPatientEmail: async (message: Record<string, unknown>) => {
    mock.sends.push(message)
    const outcome = mock.outcomes.shift() ?? mock.outcome
    return outcome === 'SENT' ? { status: 'SENT', providerId: 'provider-1' } : { status: outcome }
  },
}))

import { queuePatientEmail } from './patient-email-outbox'

const message = { kind: 'verification' as const, eventId: 'verification-12345678',
  recipient: 'Patient@Example.test', content: {
    title: 'Confirma tu cuenta', message: 'Confirma tu correo', actionLabel: 'Confirmar',
    actionUrl: 'https://ruedelunbtaomhrzgelc.supabase.co/auth/v1/verify?token=private-qa-token',
  } }

describe('patient email outbox', () => {
  beforeEach(() => {
    mock.rows.clear(); mock.queueArgs.length = 0; mock.sends.length = 0; mock.outcome = 'SENT'; mock.outcomes.length = 0
    vi.stubEnv('PATIENT_EMAIL_OUTBOX_KEY', Buffer.alloc(32, 7).toString('base64'))
  })

  it('encrypts the confirmation link before persistence and sends once', async () => {
    expect(await queuePatientEmail(message)).toEqual({ status: 'SENT' })
    const persisted = JSON.stringify(mock.queueArgs[0])
    expect(persisted).not.toContain('private-qa-token')
    expect(persisted).not.toContain('Confirma tu cuenta')
    expect(mock.sends[0]).toMatchObject({ recipient: 'patient@example.test',
      content: { actionUrl: message.content.actionUrl } })
    expect(await queuePatientEmail(message)).toEqual({ status: 'SENT' })
    expect(mock.sends).toHaveLength(1)
  })

  it('retains an ambiguous delivery for review and never sends it twice', async () => {
    mock.outcome = 'UNKNOWN'
    expect(await queuePatientEmail(message)).toEqual({ status: 'UNKNOWN' })
    expect(await queuePatientEmail(message)).toEqual({ status: 'UNKNOWN' })
    expect(mock.sends).toHaveLength(1)
  })

  it('retries one known rejection immediately and keeps the outbox row', async () => {
    mock.outcome = 'FAILED'
    expect(await queuePatientEmail(message)).toEqual({ status: 'RETRY' })
    expect(mock.sends).toHaveLength(2)
    expect(mock.rows.size).toBe(1)
  })

  it('sends successfully after one known rejection without creating another row', async () => {
    mock.outcomes.push('FAILED', 'SENT')
    expect(await queuePatientEmail(message)).toEqual({ status: 'SENT' })
    expect(mock.sends).toHaveLength(2)
    expect(mock.rows.size).toBe(1)
  })

  it('fails closed when its encryption key is missing', async () => {
    vi.stubEnv('PATIENT_EMAIL_OUTBOX_KEY', '')
    expect(await queuePatientEmail(message)).toEqual({ status: 'NOT_CONFIGURED' })
    expect(mock.queueArgs).toHaveLength(0)
  })

  it('rejects malformed base64 rather than accepting a loosely decoded key', async () => {
    vi.stubEnv('PATIENT_EMAIL_OUTBOX_KEY', `${Buffer.alloc(32, 7).toString('base64')}!`)
    expect(await queuePatientEmail(message)).toEqual({ status: 'NOT_CONFIGURED' })
    expect(mock.queueArgs).toHaveLength(0)
  })
})
