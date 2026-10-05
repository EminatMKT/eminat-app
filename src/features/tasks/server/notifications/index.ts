import { Resend } from 'resend'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { serverEnv } from '@/shared/db/env.server'
import { TABLES } from '@/shared/data/tables'
import { buildAssignmentEmail } from '../assignment-email'

type OutboxEvent = { id: string; activity_id: string; recipient_id: string; event: string; attempts: number; sequence_id: number }
const MAX_ATTEMPTS = 5

function nextAttempt(attempts: number) {
  return new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000).toISOString()
}

// Both immediate delivery and the scheduled worker claim through the same atomic SQL function.
// An unknown provider outcome stays in `sending` for reconciliation; it is never resent blindly.
export default async function dispatchTaskAssignmentEmails(activityId?: string) {
  if (!serverEnv.RESEND_API_KEY) return { warning: 'Correo pendiente: RESEND_API_KEY no configurada.', processed: 0 }
  const db = supabaseAdmin()
  const { data: events, error } = await db.rpc('claim_task_assignment_emails', {
    p_activity_id: activityId || null, p_limit: 25,
  })
  if (error) return { warning: 'No se pudo reclamar la cola de correo.', processed: 0 }
  const resend = new Resend(serverEnv.RESEND_API_KEY)
  let failed = 0
  for (const event of (events || []) as OutboxEvent[]) {
    const eventDb = db.from(TABLES.taskEmailOutbox)
    try {
      // `actividades.responsable_id` is gone (feat/multi-responsables): "is this recipient still
      // assigned" now means "is there still an actividad_responsables row for them".
      const taskQuery = db.from(TABLES.actividades).select('id,titulo,empresa,fecha_entrega').eq('id', event.activity_id).maybeSingle()
      const recipientQuery = db.from(TABLES.usuarios).select('id,email,nombre_display,nombre,apellido,activo').eq('id', event.recipient_id).maybeSingle()
      const assignedQuery = db.from(TABLES.actividadResponsables).select('usuario_id').eq('actividad_id', event.activity_id).eq('usuario_id', event.recipient_id).maybeSingle()
      const lookups: [typeof taskQuery, typeof recipientQuery, typeof assignedQuery] = [taskQuery, recipientQuery, assignedQuery]
      const [{ data: task, error: taskError }, { data: recipient, error: recipientError }, { data: stillAssigned, error: assignedError }] =
        await Promise.all(lookups)
      if (taskError || recipientError || assignedError) {
        await eventDb.update({ status: 'failed', error: 'No se pudieron consultar los datos del aviso.',
          next_attempt_at: event.attempts < MAX_ATTEMPTS ? nextAttempt(event.attempts) : null }).eq('id', event.id)
        failed++
        continue
      }
      const { data: latest, error: latestError } = await db.from(TABLES.taskEmailOutbox)
        .select('id').eq('activity_id', event.activity_id).eq('recipient_id', event.recipient_id)
        .order('sequence_id', { ascending: false }).limit(1).maybeSingle()
      if (latestError) {
        await eventDb.update({ status: 'failed', error: 'No se pudo validar la asignación vigente.',
          next_attempt_at: event.attempts < MAX_ATTEMPTS ? nextAttempt(event.attempts) : null }).eq('id', event.id)
        failed++
        continue
      }
      if (!task || !stillAssigned || latest?.id !== event.id) {
        await eventDb.update({ status: 'failed', error: 'Asignación reemplazada antes del envío.', next_attempt_at: null }).eq('id', event.id)
        continue
      }
      if (!recipient?.activo || !recipient.email) {
        await eventDb.update({ status: 'failed', error: 'Responsable activo o email no disponible.', next_attempt_at: null }).eq('id', event.id)
        failed++
        continue
      }
      const defaultUrl = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/tasks` : 'https://app.stratixsolutions.us/tasks'
      const base = (serverEnv.TASKS_PUBLIC_URL || defaultUrl).replace(/\/$/, '')
      const url = base
      const message = buildAssignmentEmail({
        name: recipient.nombre_display || `${recipient.nombre || ''} ${recipient.apellido || ''}`.trim(),
        title: task.titulo, area: task.empresa, dueDate: task.fecha_entrega, url,
      })
      const { data, error: sendError } = await resend.emails.send({
        from: serverEnv.TASK_NOTIFY_FROM_EMAIL || 'LILLY <notificaciones@stratixsolutions.us>',
        to: recipient.email, ...message,
      }, { idempotencyKey: `lilly-assignment-${event.id}` })
      if (sendError) {
        await eventDb.update({ status: 'failed', error: sendError.message.slice(0, 500),
          next_attempt_at: event.attempts < MAX_ATTEMPTS ? nextAttempt(event.attempts) : null }).eq('id', event.id)
        failed++
        continue
      }
      const { error: updateError } = await eventDb.update({ status: 'sent', provider_message_id: data?.id || null,
        sent_at: new Date().toISOString(), next_attempt_at: null }).eq('id', event.id)
      if (updateError) failed++ // Provider accepted it. Leave `sending` for manual reconciliation.
    } catch (err) {
      // A transport exception might mean Resend accepted the email. Never retry automatically.
      await eventDb.update({ error: err instanceof Error ? err.message.slice(0, 500) : 'Resultado incierto del envío.' }).eq('id', event.id)
      failed++
    }
  }
  return { warning: failed ? `${failed} aviso(s) por correo requieren revisión o reintento.` : null, processed: events?.length || 0 }
}
