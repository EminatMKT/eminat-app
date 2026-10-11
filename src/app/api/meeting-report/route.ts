import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import {
  classifyAttendance,
  createMeetingPdf,
  meetingDuration,
  type MeetingReportData,
  type ReportPerson,
  type ReportTask,
} from '@/features/meet/lib/pdf/meeting-report'
import { createHash } from 'node:crypto'
import { canManageMeeting } from '@/features/meet/lib/notifications/task-command'
import { buildMeetingReportEmail } from '@/features/meet/lib/email/meeting-report'
import { getStratixMeetSender } from '@/features/meet/lib/email/sender'
import { meetingModalityLabel, meetingTypeLabel, taskStatusLabel, type Meeting, type MeetingModality, type MeetingType } from '@/features/meet/lib/types'
import { MODULE } from '@/shared/auth/permissions'
import { RPCS } from '@/shared/schema'

export const runtime = 'nodejs'
const TASK_API = '/api/integrations/meet'

type ReportProfile = {
  nombre_display: string | null
  nombre: string | null
  apellido: string | null
  email: string | null
  rol: string | null
  equipos?: { nombre: string | null; departamentos?: { nombre: string | null } | { nombre: string | null }[] | null } | { nombre: string | null; departamentos?: { nombre: string | null } | { nombre: string | null }[] | null }[] | null
}
type ReportTopic = { title: string; description: string | null; section: string; order_index: number; actividad_id: string | null }
type ReportVersion = { id: string; version: number; sent_at: string | null; snapshot: MeetingReportData | null }

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') ?? ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
}

function authenticatedClient(request: Request) {
  const token = bearerToken(request)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!token || !url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

function sameCanonicalReport(left: MeetingReportData, right: MeetingReportData) {
  const { generatedAt: _leftGeneratedAt, ...leftContent } = left
  const { generatedAt: _rightGeneratedAt, ...rightContent } = right
  return JSON.stringify(leftContent) === JSON.stringify(rightContent)
}

async function loadCanonicalTask(request: Request, token: string, activityId: string): Promise<ReportTask | null> {
  const response = await fetch(new URL(`${TASK_API}/tasks/${activityId}`, request.url), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!response.ok) return null
  const body = await response.json() as {
    task?: {
      id: string
      titulo: string
      descripcion: string | null
      estado: string
      fecha_entrega: string | null
      responsable: { nombre: string } | null
      equipo: { nombre: string } | null
      departamento: { nombre: string } | null
    }
  }
  const task = body.task
  if (!task) return null
  return {
    id: task.id,
    title: task.titulo,
    description: task.descripcion,
    responsible: task.responsable?.nombre ?? null,
    team: task.equipo?.nombre ?? null,
    department: task.departamento?.nombre ?? null,
    dueDate: task.fecha_entrega,
    status: task.estado,
  }
}

async function loadReport(request: Request, meetingId: string, locale: 'es' | 'en', requireFinalized = true) {
  const token = bearerToken(request)
  const client = authenticatedClient(request)
  if (!client) return { error: 'No autorizado', status: 401 } as const
  const { data: auth } = await client.auth.getUser()
  if (!auth.user) return { error: 'No autorizado', status: 401 } as const
  const { data: hasMeetingsAccess, error: permissionError } = await client.rpc(RPCS.hasModule, { p_slug: MODULE.REUNIONES })
  if (permissionError || !hasMeetingsAccess) return { error: 'Sin permiso de Meetings', status: 403 } as const
  const { data: actorProfile } = await client
    .from('usuarios')
    .select('nombre_display, nombre, apellido')
    .eq('auth_id', auth.user.id)
    .eq('activo', true)
    .maybeSingle()
  if (!actorProfile) return { error: 'Perfil activo no disponible', status: 403 } as const
  const actorName = actorProfile
    ? actorProfile.nombre_display || `${actorProfile.nombre ?? ''} ${actorProfile.apellido ?? ''}`.trim()
    : auth.user.email?.split('@')[0] ?? null

  const [meetingResult, topicsResult, inviteesResult] = await Promise.all([
    client
      .from('meetings')
      .select('id, user_id, title, objective, location, modality, meeting_type, meeting_date, start_time, end_time, participants, status, updated_at, empresas!meetings_company_id_fkey(nombre)')
      .eq('id', meetingId)
      .single(),
    client
      .from('topics')
      .select('title, description, section, order_index, actividad_id')
      .eq('meeting_id', meetingId)
      .order('order_index'),
    client
      .from('meeting_participants')
      .select('usuarios!meeting_participants_profile_id_fkey(nombre_display, nombre, apellido, email, rol, equipos!usuarios_equipo_id_fkey(nombre, departamentos(nombre)))')
      .eq('meeting_id', meetingId),
  ])
  const firstError = meetingResult.error || topicsResult.error || inviteesResult.error
  if (firstError || !meetingResult.data) {
    return { error: firstError?.message ?? 'Reunión no disponible', status: 403 } as const
  }

  const meeting = meetingResult.data as unknown as Meeting & { empresas?: { nombre: string } | null }
  if (!canManageMeeting(auth.user.id, meeting.user_id)) {
    return { error: 'No autorizado para generar o enviar esta acta', status: 403 } as const
  }
  if (requireFinalized && meeting.status !== 'finalizada') {
    return { error: 'La reunión aún no está finalizada', status: 409 } as const
  }
  const invitees = (inviteesResult.data ?? []).map((row) => row.usuarios as unknown as ReportProfile | null).filter((profile): profile is ReportProfile => Boolean(profile))
  const name = (profile: ReportProfile) =>
    profile.nombre_display || `${profile.nombre ?? ''} ${profile.apellido ?? ''}`.trim() || '—'
  const person = (profile: ReportProfile): ReportPerson => {
    const team = Array.isArray(profile.equipos) ? profile.equipos[0] : profile.equipos
    const department = Array.isArray(team?.departamentos) ? team.departamentos[0] : team?.departamentos
    return {
      name: name(profile),
      role: profile.rol || null,
      organization: [team?.nombre, department?.nombre].filter(Boolean).join(' / ') || null,
    }
  }
  const labels: Record<string, string> = locale === 'en'
    ? { resumen: 'Summary', decisiones: 'Decisions', detalles: 'Details' }
    : { resumen: 'Resumen', decisiones: 'Decisiones', detalles: 'Detalles' }
  const topics = (topicsResult.data ?? []) as ReportTopic[]
  const activityIds = Array.from(new Set(
    topics
      .filter((topic) => topic.section === 'proximos_pasos' && topic.actividad_id)
      .map((topic) => topic.actividad_id as string)
  ))
  const taskResults = await Promise.all(activityIds.map((activityId) => loadCanonicalTask(request, token, activityId)))
  if (taskResults.some((task) => !task)) {
    return { error: 'Una o más Tasks vinculadas no están disponibles en StratixCRM', status: 502 } as const
  }
  const inviteePeople = invitees.map(person)
  const attendance = classifyAttendance(inviteePeople, meeting.participants ?? [])
  const attendeeNames = new Set(attendance.attendees.map((person) => person.name))
  const attendedProfiles = invitees.filter((profile) => attendeeNames.has(name(profile)))
  const recipients = attendedProfiles
    .filter((profile) => typeof profile.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))
    .map((profile) => ({ name: name(profile), email: profile.email as string }))
  const omitted = [
    ...attendedProfiles
      .filter((profile) => !profile.email)
      .map((profile) => ({ name: name(profile), reason: locale === 'en' ? 'No email available' : 'Sin correo disponible' })),
    ...attendedProfiles
      .filter((profile) => profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))
      .map((profile) => ({ name: name(profile), reason: locale === 'en' ? 'Invalid email' : 'Correo inválido' })),
    ...attendance.externalGuests.map((guest) => ({ name: guest.name, reason: locale === 'en' ? 'External attendee without an email profile' : 'Asistente externo sin perfil de correo' })),
  ]
  const report: MeetingReportData = {
    locale,
    id: meeting.id,
    generatedAt: new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Guayaquil',
    }).format(new Date()),
    title: meeting.title,
    company: meeting.empresas?.nombre ?? null,
    organization: null,
    location: meeting.location ?? null,
    modality: meeting.modality ? meetingModalityLabel(meeting.modality as MeetingModality, locale) : null,
    meetingType: meeting.meeting_type ? meetingTypeLabel(meeting.meeting_type as MeetingType, locale) : null,
    date: meeting.meeting_date,
    startTime: meeting.start_time?.slice(0, 5) ?? null,
    endTime: meeting.end_time?.slice(0, 5) ?? null,
    duration: meetingDuration(meeting.start_time, meeting.end_time),
    objective: meeting.objective,
    invitees: inviteePeople,
    attendees: attendance.attendees,
    absentees: attendance.absentees,
    externalGuests: attendance.externalGuests,
    tasks: (taskResults as ReportTask[]).map((task) => ({ ...task, status: taskStatusLabel(task.status, locale) })),
    nextMeeting: null,
    sections: Object.entries(labels).map(([key, title]) => ({
      title,
      items: topics.filter((topic) => topic.section === key),
    })),
  }
  return {
    report,
    client,
    actorId: auth.user.id,
    actorName,
    recipients: Array.from(new Map(recipients.map((recipient) => [recipient.email.toLowerCase(), recipient])).values()),
    omitted,
    reportVersion: `${meeting.id}:${meeting.updated_at}`,
  }
}

export async function POST(request: Request) {
  let meetingId = ''
  let locale: 'es' | 'en' = 'es'
  let action: 'download' | 'send' = 'send'
  try {
    const body = (await request.json()) as { meetingId?: string; locale?: string; action?: string }
    meetingId = body.meetingId ?? ''
    locale = body.locale === 'en' ? 'en' : 'es'
    action = body.action === 'download' ? 'download' : 'send'
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  if (!meetingId) return NextResponse.json({ error: 'meetingId requerido' }, { status: 400 })
  const loaded = await loadReport(request, meetingId, locale, action === 'send')
  if ('error' in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status })
  }
  const { data: previousVersions } = await loaded.client
    .from('meeting_report_versions')
    .select('id, version, sent_at, snapshot')
    .eq('meeting_id', meetingId)
    .order('version', { ascending: false })
    .limit(10)
  const latestVersion = ((previousVersions?.[0] as { version?: number } | undefined)?.version ?? 0)
  const reusableVersion = action === 'send'
    ? ((previousVersions ?? []) as ReportVersion[]).find((entry) =>
      !entry.sent_at && entry.snapshot && sameCanonicalReport(entry.snapshot as MeetingReportData, loaded.report)
    ) as { id: string; version: number; snapshot: MeetingReportData } | undefined
    : undefined
  const reportForDelivery = reusableVersion?.snapshot ?? loaded.report
  const pdf = createMeetingPdf(reportForDelivery)
  const version = reusableVersion?.version ?? latestVersion + 1
  if (action === 'download') {
    const { error: versionError } = await loaded.client.from('meeting_report_versions').insert({
      meeting_id: meetingId,
      version,
      generated_by: loaded.actorId,
      generated_at: new Date().toISOString(),
      sent_at: null,
      snapshot: loaded.report,
    })
    if (versionError) return NextResponse.json({ error: 'No se pudo registrar la versión del acta.' }, { status: 500 })
    await loaded.client.from('meeting_events').insert({
      meeting_id: meetingId, actor_id: loaded.actorId, event_type: 'report_generated',
      summary: `Acta v${version} generada`, metadata: { version, actor_name: loaded.actorName, delivery: 'download' },
    })
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="meeting-minutes-${meetingId}-v${version}.pdf"`,
        'X-Meeting-Report-Version': String(version),
      },
    })
  }
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || loaded.recipients.length === 0) {
    return NextResponse.json({
      error: !apiKey
        ? 'El servicio de correo no está configurado.'
        : 'No hay asistentes con un correo válido para recibir el acta.',
      omitted: loaded.omitted,
    }, { status: 422 })
  }
  const resend = new Resend(apiKey)
  let from: string
  try {
    from = getStratixMeetSender()
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Remitente no válido.' }, { status: 500 })
  }
  const attachment = Buffer.from(pdf).toString('base64')
  const message = buildMeetingReportEmail(reportForDelivery)
  const results = await Promise.allSettled(
    loaded.recipients.map((recipient) => {
      const recipientHash = createHash('sha256')
        .update(recipient.email.toLowerCase())
        .digest('hex')
        .slice(0, 16)
      return resend.emails.send(
        {
          from,
          to: recipient.email,
          ...message,
          attachments: [
            {
              filename: `acta-${meetingId}.pdf`,
              content: attachment,
            },
          ],
        },
        {
          idempotencyKey: `meeting-report/${loaded.reportVersion}/${recipientHash}`,
        }
      )
    })
  )
  const deliveries = results.map((result, index) => {
    const recipient = loaded.recipients[index]
    if (result.status === 'rejected') return { ...recipient, status: 'failed' as const, reason: result.reason instanceof Error ? result.reason.message : 'Resend rechazó la solicitud' }
    if (result.value.error) return { ...recipient, status: 'failed' as const, reason: result.value.error.message }
    return { ...recipient, status: 'sent' as const }
  })
  const sent = deliveries.filter((delivery) => delivery.status === 'sent')
  const failed = deliveries.filter((delivery) => delivery.status === 'failed')
  const versionWrite = reusableVersion
    ? loaded.client
      .from('meeting_report_versions')
      .update({ sent_at: sent.length > 0 ? new Date().toISOString() : null })
      .eq('id', reusableVersion.id)
      .select('id')
      .maybeSingle()
    : loaded.client
      .from('meeting_report_versions')
      .insert({
        meeting_id: meetingId,
        version,
        generated_by: loaded.actorId,
        generated_at: new Date().toISOString(),
        sent_at: sent.length > 0 ? new Date().toISOString() : null,
        snapshot: reportForDelivery,
      })
      .select('id')
      .maybeSingle()
  const { data: storedVersion, error: versionError } = await versionWrite
  if (versionError || !storedVersion) {
    return NextResponse.json({ error: 'El envío terminó, pero no se pudo registrar la versión del acta.', deliveries, omitted: loaded.omitted }, { status: 500 })
  }
  const events = [
    ...(!reusableVersion ? [{
      meeting_id: meetingId, actor_id: loaded.actorId, event_type: 'report_generated',
      summary: `Acta v${version} generada`, metadata: { version, actor_name: loaded.actorName },
    }] : []),
    {
      meeting_id: meetingId, actor_id: loaded.actorId, event_type: 'report_sent',
      summary: `Acta v${version}: ${sent.length} enviada(s), ${failed.length} fallida(s), ${loaded.omitted.length} omitida(s)`,
      metadata: { version, sent: sent.length, failed, omitted: loaded.omitted, actor_name: loaded.actorName, reused_canonical_pdf: Boolean(reusableVersion) },
    },
  ]
  const { error: eventError } = await loaded.client.from('meeting_events').insert(events)
  if (eventError) {
    return NextResponse.json({ error: 'El envío terminó, pero no se pudo registrar correctamente en el historial.', version, deliveries, omitted: loaded.omitted }, { status: 500 })
  }
  if (failed.length > 0) {
    return NextResponse.json({
      error: `Falló el envío a ${failed.length} destinatario(s).`,
      version,
      deliveries,
      omitted: loaded.omitted,
    }, { status: 502 })
  }
  return NextResponse.json({ ok: true, recipients: sent.length, version, deliveries, omitted: loaded.omitted })
}
