import { Resend } from 'resend'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { serverEnv } from '@/shared/db/env.server'

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch] || ch))

// The outbox row is created by a database trigger in the same transaction as the assignment.
// Claiming pending -> sending is conditional: a duplicate HTTP request cannot send twice.
// An uncertain provider result stays in `sending` for manual reconciliation, never automatic resend.
export async function dispatchTaskAssignmentEmails(activityId: string) {
  const db = supabaseAdmin()
  const { data: pending, error } = await db.from('task_email_outbox')
    .select('id,recipient_id').eq('activity_id', activityId).eq('status', 'pending')
  if (error) return { warning: 'No se pudo consultar la cola de correo.' }
  if (!serverEnv.RESEND_API_KEY) return { warning: 'Correo pendiente: RESEND_API_KEY no configurada.' }
  const resend = new Resend(serverEnv.RESEND_API_KEY)
  let failed = 0
  for (const event of pending || []) {
    const { data: claimed } = await db.from('task_email_outbox')
      .update({ status: 'sending', error: null }).eq('id', event.id).eq('status', 'pending').select('id').maybeSingle()
    if (!claimed) continue
    try {
      const [{ data: task }, { data: recipient }] = await Promise.all([
        db.from('actividades').select('id,titulo,responsable_id').eq('id', activityId).single(),
        db.from('usuarios').select('email,nombre').eq('id', event.recipient_id).single(),
      ])
      if (!task || !recipient?.email || task.responsable_id !== event.recipient_id) {
        await db.from('task_email_outbox').update({ status: 'failed', error: 'Responsable o email no disponible.' }).eq('id', event.id)
        failed++
        continue
      }
      // Task titles/descriptions can contain sensitive data. The email intentionally contains
      // only a generic assignment notice; details stay behind LILLY authentication.
      const url = 'https://app.stratixsolutions.us/tasks'
      const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#202b3d"><h1 style="font-size:24px">LILLY</h1><p>Hola ${escapeHtml(recipient.nombre || '')},</p><p>Se te ha asignado una tarea en LILLY.</p><p>Entra a Tasks para ver los detalles.</p><p><a href="${url}" style="display:inline-block;background:#6556db;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Ver tarea en LILLY</a></p></div>`
      const { data, error: sendError } = await resend.emails.send({
        from: 'LILLY <noreply@stratixsolutions.us>', to: recipient.email,
        subject: 'Nueva tarea asignada en LILLY', html,
      })
      if (sendError) throw new Error(sendError.message)
      await db.from('task_email_outbox').update({ status: 'sent', provider_message_id: data?.id || null, sent_at: new Date().toISOString() }).eq('id', event.id)
    } catch (err) {
      await db.from('task_email_outbox').update({ status: 'failed', error: err instanceof Error ? err.message.slice(0, 500) : 'Error de envío' }).eq('id', event.id)
      failed++
    }
  }
  return { warning: failed ? `${failed} aviso(s) por correo no se pudieron entregar.` : null }
}
