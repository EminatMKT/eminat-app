import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { meetingMailDatabase } from './mail-outbox'

export type DeliveryReader = { get: (id: string) => Promise<{
  data: { id: string; last_event: string } | null; error: { message: string } | null
}> }
type Candidate = { source: 'meeting' | 'task'; delivery_id: string; provider_message_id: string }

/** Read provider state only. Never enqueue, claim, resend, or change business data. */
export async function reconcileMeetingNotifications(options: {
  db?: SupabaseClient; provider?: DeliveryReader; enabled?: boolean
} = {}) {
  if (!(options.enabled ?? process.env.MEETINGS_MAIL_RECONCILE === 'true')) {
    return { warning: null, checked: 0, recorded: 0, disabled: true }
  }
  const key = process.env.RESEND_API_KEY
  if (!options.provider && !key) return { warning: 'Existing Resend integration unavailable', checked: 0, recorded: 0 }
  const db = options.db ?? meetingMailDatabase()
  const provider = options.provider ?? new Resend(key!).emails
  const { data, error } = await db.rpc('list_meeting_notification_reconciliation', { p_limit: 25 })
  if (error) throw new Error('Notification reconciliation storage unavailable')
  let checked = 0, recorded = 0, failed = 0
  for (const job of (data ?? []) as Candidate[]) {
    checked++
    try {
      const result = await provider.get(job.provider_message_id)
      if (result.error || !result.data || result.data.id !== job.provider_message_id) {
        failed++
        console.warn(JSON.stringify({ event: 'notification_reconciliation_error', source: job.source, delivery_id: job.delivery_id, provider_message_id: job.provider_message_id }))
        continue
      }
      const { data: saved, error: saveError } = await db.rpc('record_meeting_notification_delivery', {
        p_source: job.source, p_delivery_id: job.delivery_id,
        p_provider_id: job.provider_message_id, p_state: result.data.last_event,
      })
      if (saveError || !saved) { failed++; continue }
      recorded++
      console.info(JSON.stringify({ event: 'notification_delivery_reconciled', source: job.source, delivery_id: job.delivery_id, provider_message_id: job.provider_message_id, state: result.data.last_event }))
    } catch {
      failed++ // Read/transport errors never trigger another email.
      console.warn(JSON.stringify({ event: 'notification_reconciliation_error', source: job.source, delivery_id: job.delivery_id, provider_message_id: job.provider_message_id }))
    }
  }
  return { warning: failed ? 'Provider delivery reconciliation incomplete' : null, checked, recorded }
}
