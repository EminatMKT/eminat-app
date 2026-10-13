import { Resend } from 'resend'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { serverEnv } from '@/shared/db/env.server'
import { buildBirthdayEmail, guayaquilBirthdayDate } from './birthday-email'

export default async function processBirthdays(now = new Date()) {
  if (!serverEnv.RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada')
  const date = guayaquilBirthdayDate(now)
  const [year, month, day] = date.split('-').map(Number)
  const db = supabaseAdmin()
  const { data: birthdays, error } = await db.from('usuario_perfil_privado')
    .select('usuario_id').eq('cumple_confirmado', true).eq('cumple_mes', month).eq('cumple_dia', day)
  if (error) throw new Error('No se pudieron consultar cumpleaños')
  const resend = new Resend(serverEnv.RESEND_API_KEY)
  let sent = 0; let review = 0; let skipped = 0
  for (const birthday of birthdays || []) {
    const { data: user, error: userError } = await db.from('usuarios')
      .select('id,nombre,email,activo').eq('id', birthday.usuario_id).maybeSingle()
    if (userError) throw new Error('No se pudo verificar usuario activo')
    if (!user?.activo || !user.email) { skipped++; continue }
    const key = `birthday/${user.id}/${year}`
    const { data: claim, error: claimError } = await db.from('usuario_cumpleanos_envios')
      .insert({ usuario_id: user.id, dedupe_key: key, cumple_fecha: date, anio: year, email: user.email, status: 'sending' })
      .select('id').single()
    if (claimError?.code === '23505') { skipped++; continue }
    if (claimError || !claim) throw new Error('No se pudo registrar el envío antes de llamar al proveedor')
    try {
      // Recheck after claiming: a retired user must never receive a message.
      const { data: current, error: currentError } = await db.from('usuarios')
        .select('activo,email').eq('id', user.id).maybeSingle()
      const { data: currentBirthday, error: birthdayError } = await db.from('usuario_perfil_privado')
        .select('cumple_confirmado,cumple_mes,cumple_dia').eq('usuario_id', user.id).maybeSingle()
      if (currentError || birthdayError) throw new Error('No se pudo verificar elegibilidad antes del envío')
      if (!current?.activo || current.email !== user.email || !currentBirthday?.cumple_confirmado ||
          currentBirthday.cumple_mes !== month || currentBirthday.cumple_dia !== day) {
        await db.from('usuario_cumpleanos_envios').update({ status: 'failed', error: 'Elegibilidad cambió antes del envío' }).eq('id', claim.id)
        skipped++; continue
      }
      const { data, error: sendError } = await resend.emails.send({
        from: serverEnv.TASK_NOTIFY_FROM_EMAIL || 'LILLY <notificaciones@stratixsolutions.us>',
        to: user.email,
        ...buildBirthdayEmail(user.nombre || ''),
      }, { idempotencyKey: key })
      if (sendError) {
        await db.from('usuario_cumpleanos_envios').update({ status: 'failed', error: sendError.message.slice(0, 500) }).eq('id', claim.id)
        review++; continue
      }
      if (!data?.id) {
        await db.from('usuario_cumpleanos_envios').update({ error: 'Proveedor sin ID; conciliar antes de reenviar' }).eq('id', claim.id)
        review++; continue
      }
      const { error: logError } = await db.from('usuario_cumpleanos_envios').update({ status: 'sent', provider_message_id: data.id,
        sent_at: new Date().toISOString() }).eq('id', claim.id)
      if (logError) review++; else sent++
    } catch (cause) {
      // Transport errors can mean provider acceptance. Keep the unique claim;
      // never replay an uncertain send without manual reconciliation.
      await db.from('usuario_cumpleanos_envios').update({ error: cause instanceof Error ? cause.message.slice(0, 500) : 'Resultado incierto' }).eq('id', claim.id)
      review++
    }
  }
  return { date, sent, review, skipped }
}
