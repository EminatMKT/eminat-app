'use client'

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/shared/db/supabase'
import { useMeetingQuery } from '@/features/meet/hooks/useMeetingQuery'
import { useMeetingEditor } from '@/features/meet/hooks/useMeetingEditor'
import { useTopicsEditor } from '@/features/meet/hooks/useTopicsEditor'
import { useTaskEditor } from '@/features/meet/hooks/useTaskEditor'
import { updateMeetingAttendance, updateMeetingEditorial } from '@/features/meet/lib/services/meetings'
import {
  persistTopicOrder,
  updateTopicEditorial,
} from '@/features/meet/lib/services/topics'
import { canDeleteTopic } from '@/features/meet/lib/local/legacy-guards'
import { createTask, isTaskConflict, updateTask } from '@/features/meet/lib/services/task-api'
import { ensureMeetingActivity, MEETING_ACTIVITY_SECTION, syncMeetingActivity } from '@/features/meet/lib/services/meeting-activity'
import {
  actividadEstadoStyle,
  MEETING_MODALITY_OPTIONS,
  MEETING_SECTIONS,
  MEETING_TYPE_OPTIONS,
  meetingModalityLabel,
  meetingTypeLabel,
  taskStatusLabel,
  usuarioNombre,
  type Meeting,
  type MeetingSection,
  type LinkedActivitySummary,
  type CanonicalTaskRecord,
  type TaskOrganization,
  type Topic,
} from '@/features/meet/lib/types'
import { ActaPrint } from '@/features/meet/components/ActaPrint'
import { TaskAssignmentFields } from '@/features/meet/components/TaskAssignmentFields'
import { NO_ORGANIZATION } from '@/features/meet/lib/task-organization'
import { recordMeetingEvent } from '@/features/meet/lib/services/meeting-history'
import { usePreferences } from '@/features/meet/lib/preferences'

type Draft = {
  title: string
  description: string
  responsableId: string
  departmentId: string
  teamId: string
  deadline: string
}
type PrintParticipant = { nombre: string; cargo: string | null }

const emptyDraft = (): Draft => ({
  title: '',
  description: '',
  responsableId: '',
  departmentId: '',
  teamId: '',
  deadline: '',
})

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand'

export default function MeetingPage() {
  const { locale, t } = usePreferences()
  const copy = locale === 'es' ? {
    back: '← Volver', title: 'Título', objective: 'Objetivo', date: 'Fecha', place: 'Lugar', start: 'Hora de inicio', end: 'Hora de fin', type: 'Tipo', modality: 'Modalidad', company: 'Empresa', schedule: 'Horario', saving: 'Guardando…', save: 'Guardar acta', cancel: 'Cancelar', edit: 'Editar acta de reunión', print: 'Imprimir / Guardar PDF', generating: 'Generando PDF…', finalize: 'Finalizar reunión', finalizeAndSend: 'Finalizar y enviar acta de reunión', sendReport: 'Enviar acta de reunión', reopen: 'Reabrir reunión', invitees: 'Convocados', attendees: 'Asistentes', attendance: 'Registro de asistencia', attended: 'Asistió', absent: 'Ausente', empty: 'Sin registros todavía.', action: 'Acción a realizar', point: 'Nuevo punto…', detail: 'Detalle (opcional)', add: 'Agregar a', due: 'Fecha límite',
  } : {
    back: '← Back', title: 'Title', objective: 'Objective', date: 'Date', place: 'Location', start: 'Start time', end: 'End time', type: 'Type', modality: 'Format', company: 'Company', schedule: 'Schedule', saving: 'Saving…', save: 'Save minutes', cancel: 'Cancel', edit: 'Edit meeting minutes', print: 'Print / Save PDF', generating: 'Generating PDF…', finalize: 'Finalize meeting', finalizeAndSend: 'Finalize and send meeting minutes', sendReport: 'Send meeting minutes', reopen: 'Reopen meeting', invitees: 'Invitees', attendees: 'Attendees', attendance: 'Attendance', attended: 'Attended', absent: 'Absent', empty: 'No entries yet.', action: 'Action item', point: 'New item…', detail: 'Details (optional)', add: 'Add to', due: 'Due date',
  }
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const meetingQuery = useMeetingQuery(id)
  const meeting = meetingQuery.meeting
  const companyName = meeting?.empresas?.nombre ?? null
  const companyCodigo = meeting?.empresas?.codigo ?? null
  const topics = meetingQuery.topics
  const usuarios = meetingQuery.profiles
  const solicitanteId = meetingQuery.businessUserId
  const organization = meetingQuery.organization
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editingMeeting, setEditingMeeting] = useState(false)
  const [savingMeeting, setSavingMeeting] = useState(false)
  const [sendingReport, setSendingReport] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null)
  const meetingEditor = useMeetingEditor(meeting)

  const [drafts, setDrafts] = useState<Record<MeetingSection, Draft>>({
    resumen: emptyDraft(),
    decisiones: emptyDraft(),
    proximos_pasos: emptyDraft(),
    detalles: emptyDraft(),
  })

  const usuariosById = useMemo(
    () => Object.fromEntries(usuarios.map((u) => [u.id, u])),
    [usuarios]
  )
  const actividadEstados = useMemo(
    () =>
      Object.fromEntries(
        meetingQuery.activities.map((activity) => [
          activity.id,
          activity.estado,
        ])
      ),
    [meetingQuery.activities]
  )
  const activitiesById = useMemo(
    () =>
      Object.fromEntries(
        meetingQuery.activities.map((activity) => [activity.id, activity])
      ),
    [meetingQuery.activities]
  )
  const meetingActivityTopic = useMemo(
    () => topics.find((topic) => (topic.section as string) === MEETING_ACTIVITY_SECTION) ?? null,
    [topics]
  )
  const meetingActivityLinked = Boolean(meetingActivityTopic?.actividad_id)
  const meetingActivity = meetingActivityTopic?.actividad_id
    ? activitiesById[meetingActivityTopic.actividad_id] ?? null
    : null
  const invitees = useMemo<PrintParticipant[]>(() => {
    if (meetingQuery.participants.length > 0) {
      return meetingQuery.participants.map(({ profile }) => ({
        nombre: profile ? usuarioNombre(profile) : '—',
        cargo: profile?.rol ?? null,
      }))
    }
    return (meeting?.participants ?? []).map((nombre) => ({
      nombre,
      cargo: null,
    }))
  }, [meeting?.participants, meetingQuery.participants])
  const attendees = useMemo<PrintParticipant[]>(
    () =>
      (meeting?.participants ?? []).map((nombre) => ({
        nombre,
        cargo: null,
      })),
    [meeting?.participants]
  )

  async function setAttendance(profile: typeof meetingQuery.participants[number]['profile'], attended: boolean) {
    if (!meeting || !profile) return
    const name = usuarioNombre(profile)
    const next = attended
      ? Array.from(new Set([...(meeting.participants ?? []), name]))
      : (meeting.participants ?? []).filter((item) => item !== name)
    const result = await updateMeetingAttendance(meeting.id, next, meeting.updated_at)
    if (result.ok === false) { setError(result.error.message); return }
    meetingQuery.patchMeeting(result.data)
    await recordMeetingEvent(meeting.id, 'meeting_updated', `${copy.attendance}: ${name} — ${attended ? copy.attended : copy.absent}`, { profile_id: profile.id, attended })
  }

  async function retryMeetingActivity() {
    if (!meeting || !solicitanteId || !companyCodigo) return
    setError(null)
    try {
      const linked = await ensureMeetingActivity({
        meeting,
        creatorProfileId: solicitanteId,
        creatorAuthId: meeting.user_id,
        companyCode: companyCodigo,
        existingTopic: meetingActivityTopic,
      })
      meetingQuery.replaceTopic(linked.topic)
      meetingQuery.replaceActivity(linked.activity)
      await recordMeetingEvent(
        meeting.id,
        'task_created',
        `${locale === 'es' ? 'Activity de reunión vinculada en StratixCRM' : 'Meeting Activity linked in StratixCRM'}: ${meeting.title}`,
        { activity_id: linked.activity.id, topic_id: linked.topic.id, kind: 'meeting_activity', retry: true }
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (locale === 'es' ? 'No se pudo vincular la reunión con LILLY.' : 'The meeting could not be linked to LILLY.'))
    }
  }

  function updateDraft(section: MeetingSection, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }))
  }

  async function saveMeeting() {
    if (!meeting || !meetingEditor.validatedPayload) return
    setSavingMeeting(true)
    setError(null)
    const result = await updateMeetingEditorial(
      meeting.id,
      meetingEditor.validatedPayload,
      meeting.updated_at
    )
    setSavingMeeting(false)
    if (result.ok === false) {
      setError(result.error.message)
      return
    }
    meetingQuery.patchMeeting(result.data)
    meetingEditor.acceptSaved(result.data)
    setEditingMeeting(false)
    const activityId = meetingActivityTopic?.actividad_id
    const activity = activityId ? activitiesById[activityId] : null
    if (activity && companyCodigo) {
      try {
        const synced = await syncMeetingActivity(result.data, activity, companyCodigo)
        meetingQuery.replaceActivity(synced)
      } catch (caught) {
        if (isTaskConflict(caught)) meetingQuery.replaceActivity(caught.current)
        setError(caught instanceof Error ? `La reunión se guardó, pero su Activity no pudo sincronizarse: ${caught.message}` : 'La reunión se guardó, pero su Activity no pudo sincronizarse.')
        await recordMeetingEvent(meeting.id, 'meeting_updated', 'La reunión se actualizó; la sincronización de su Activity quedó pendiente')
        return
      }
    }
    await recordMeetingEvent(meeting.id, 'meeting_updated', 'Se actualizaron los datos de la reunión')
  }

  async function reorderTopic(section: MeetingSection, targetId: string) {
    if (!draggedTopicId || draggedTopicId === targetId) return
    const sectionTopics = topics
      .filter((topic) => topic.section === section)
      .sort((a, b) => a.order_index - b.order_index)
    const from = sectionTopics.findIndex((topic) => topic.id === draggedTopicId)
    const to = sectionTopics.findIndex((topic) => topic.id === targetId)
    if (from < 0 || to < 0) return
    const reordered = [...sectionTopics]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    const normalized = reordered.map((topic, order_index) => ({
      ...topic,
      order_index,
    }))
    const otherTopics = topics.filter((topic) => topic.section !== section)
    meetingQuery.replaceTopics([...otherTopics, ...normalized])
    setDraggedTopicId(null)
    const result = await persistTopicOrder(normalized)
    if (result.ok === false) {
      meetingQuery.replaceTopics(topics)
      setError(`No se pudo guardar el nuevo orden: ${result.error.message}`)
    } else {
      await recordMeetingEvent(id, 'meeting_updated', 'Se actualizó el orden del acta')
    }
  }

  /** Crea una fila en actividades (CRM) para un punto y la enlaza al topic. */
  async function createActividad(
    topic: Topic,
    responsableId: string,
    deadline?: string
  ): Promise<{ id?: string; error?: string }> {
    if (topic.actividad_id) return { id: topic.actividad_id }
    if (!meetingQuery.capabilities.canCreateActivity) {
      return {
        error:
          'la creación está bloqueada porque faltan datos críticos o permisos de lectura',
      }
    }
    if (!solicitanteId) {
      return {
        error:
          "no se pudo resolver el solicitante (creador no vinculado en 'usuarios')",
      }
    }
    if (!companyCodigo) return { error: 'la reunión no tiene una empresa válida' }
    try {
      const activity = await createTask({
        topic_id: topic.id,
        titulo: topic.title,
        descripcion: topic.description || null,
        responsable_id: responsableId,
        fecha_inicio: meeting?.meeting_date ?? new Date().toISOString().slice(0, 10),
        fecha_entrega: deadline || null,
        empresa: companyCodigo,
      })
      meetingQuery.linkTopicActivity(topic.id, activity)
      await recordMeetingEvent(meeting?.id ?? id, 'task_created', `Task creada: ${activity.titulo}`, {
        activity_id: activity.id,
        topic_id: topic.id,
        assignee: activity.responsable?.nombre ?? null,
      })

      return { id: activity.id }
    } catch (caught) {
      return { error: caught instanceof Error ? caught.message : 'no se creó la Task' }
    }
  }

  async function addPoint(section: MeetingSection) {
    const draft = drafts[section]
    if (!draft.title.trim()) return
    setError(null)
    if (!meetingQuery.capabilities.canMutateTopics) {
      setError('No se puede agregar el punto porque la lista de Topics no está disponible.')
      return
    }
    if (
      section === 'proximos_pasos' &&
      draft.responsableId &&
      !meetingQuery.capabilities.canCreateActivity
    ) {
      setError(
        'No se puede crear el próximo paso porque faltan datos críticos de CRM.'
      )
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const orderIndex = topics.filter((t) => t.section === section).length
    const responsableId =
      section === 'proximos_pasos' ? draft.responsableId || null : null

    const { data, error } = await supabase
      .from('topics')
      .insert({
        meeting_id: id,
        section,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        responsable_id: responsableId,
        order_index: orderIndex,
        user_id: user?.id,
      })
      .select()
      .single()

    if (error || !data) {
      setError(error?.message ?? 'No se pudo guardar el punto.')
      return
    }

    let created = data as Topic

    // Tasks con responsable -> Activity canónica inmediata en el CRM.
    if (section === 'proximos_pasos' && created.responsable_id) {
      const res = await createActividad(
        created,
        created.responsable_id,
        draft.deadline
      )
      if (res.error) {
        setError(
          `Punto guardado, pero falló la tarea en el CRM: ${res.error}`
        )
      } else {
        created = { ...created, actividad_id: res.id ?? null }
      }
    }

    meetingQuery.appendTopic(created)
    await recordMeetingEvent(id, 'meeting_updated', `Se agregó un punto: ${created.title}`, { topic_id: created.id })
    setDrafts((prev) => ({ ...prev, [section]: emptyDraft() }))
  }

  async function deletePoint(topic: Topic) {
    if (!canDeleteTopic(topic)) {
      setError('No se puede eliminar un Topic que tiene una Activity vinculada.')
      return
    }
    if (!meetingQuery.capabilities.canMutateTopics) {
      setError('No se puede eliminar el Topic porque la lista no está disponible.')
      return
    }
    if (!confirm('¿Eliminar este punto?')) return
    const { error } = await supabase.from('topics').delete().eq('id', topic.id)
    if (error) {
      setError(error.message)
      return
    }
    meetingQuery.removeTopic(topic.id)
    await recordMeetingEvent(id, 'meeting_updated', `Se eliminó un punto: ${topic.title}`, { topic_id: topic.id })
  }

  async function ensureCanonicalTasks() {
    if (!meetingQuery.capabilities.canFinalize) throw new Error('No se puede finalizar porque faltan datos críticos de Topics o CRM.')
    const pending = topics.filter((topic) => topic.section === 'proximos_pasos' && topic.responsable_id && !topic.actividad_id)
    for (const topic of pending) {
      const result = await createActividad(topic, topic.responsable_id as string)
      if (result.error) throw new Error(`No se pudieron crear todas las Tasks del CRM: ${result.error}`)
    }
  }

  async function setMeetingStatus(next: Meeting['status']) {
    if (!meeting) return false
    setError(null)
    try { if (next === 'finalizada') await ensureCanonicalTasks() } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo finalizar.'); return false }
    const { data, error: statusError } = await supabase
      .from('meetings')
      .update({ status: next })
      .eq('id', meeting.id)
      .select()
      .single()
    if (statusError || !data) {
      setError(statusError?.message ?? 'No se pudo actualizar la reunión.')
      return false
    }
    meetingQuery.patchMeeting(data as Meeting)
    await recordMeetingEvent(
      meeting.id,
      next === 'finalizada' ? 'meeting_finalized' : 'meeting_reopened',
      next === 'finalizada' ? 'Reunión finalizada' : 'Reunión reabierta'
    )
    return true
  }

  async function sendMeetingReport(finalizeFirst: boolean) {
    if (!meeting) return
    setSendingReport(true)
    setError(null)
    setNotice(null)
    if (finalizeFirst && meeting.status === 'activa') {
      const finalized = await setMeetingStatus('finalizada')
      if (!finalized) { setSendingReport(false); return }
    }
    const {
      data: { session },
    } = await supabase.auth.getSession()
    try {
      const response = await fetch('/api/meeting-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ meetingId: meeting.id, locale, action: 'send' }),
      })
      const reportResult = (await response.json()) as { error?: string; recipients?: number; omitted?: { name: string; reason: string }[]; deliveries?: { name: string; email: string; status: 'sent' | 'failed'; reason?: string }[] }
      const failed = reportResult.deliveries?.filter((delivery) => delivery.status === 'failed') ?? []
      const omitted = reportResult.omitted ?? []
      if (response.ok === false) {
        const detail = failed.map((item) => `${item.name} (${item.email}): ${item.reason ?? 'falló'}`).concat(omitted.map((item) => `${item.name}: ${item.reason}`)).join(' · ')
        setError([reportResult.error ?? 'No se pudo enviar el acta.', detail].filter(Boolean).join(' '))
      } else {
        const omittedText = omitted.length > 0 ? ` ${locale === 'es' ? 'Omitidos' : 'Omitted'}: ${omitted.map((item) => `${item.name} (${item.reason})`).join(', ')}.` : ''
        setNotice(`${locale === 'es' ? 'Acta enviada correctamente' : 'Meeting minutes sent successfully'} (${reportResult.recipients ?? 0}).${omittedText}`)
      }
    } catch {
      setError('Falló la conexión durante el envío del acta.')
    } finally {
      setSendingReport(false)
    }
  }

  async function downloadMeetingReport() {
    if (!meeting) return
    setGeneratingReport(true)
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const response = await fetch('/api/meeting-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ meetingId: meeting.id, locale, action: 'download' }),
      })
      if (response.ok === false) {
        const result = await response.json().catch(() => ({})) as { error?: string }
        setError(result.error ?? 'No se pudo generar el acta.')
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `meeting-minutes-${meeting.id}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Falló la conexión durante la generación del acta.')
    } finally {
      setGeneratingReport(false)
    }
  }

  if (meetingQuery.status === 'loading') {
    return <p className="text-gray-500">{t('loading')}</p>
  }
  if (meetingQuery.status === 'not_found') {
    return <QueryMessage message="Reunión no encontrada." />
  }
  if (meetingQuery.status === 'unavailable') {
    return (
      <QueryMessage message="La reunión no está disponible. Puede no existir o estar oculta por permisos (NOT VERIFIED)." />
    )
  }
  if (meetingQuery.status === 'unauthorized') {
    return <QueryMessage message="No tienes autorización para ver esta reunión." />
  }
  if (meetingQuery.status === 'expired_session') {
    return <QueryMessage message="La sesión expiró. Vuelve a iniciar sesión." />
  }
  if (meetingQuery.status === 'network_error') {
    return (
      <QueryMessage
        message="No se pudo conectar. Revisa tu conexión e inténtalo nuevamente."
        onRetry={meetingQuery.retry}
      />
    )
  }
  if (!meeting) return <QueryMessage message="La reunión no está disponible." />

  return (
    <>
      {/* ------- Vista interactiva (oculta al imprimir) ------- */}
      <div className="space-y-6 print:hidden">
        {/* Encabezado */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <button
                onClick={() => router.push('/meetings')}
                className="mb-2 text-sm text-gray-400 hover:text-gray-600"
              >
                {copy.back}
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {meeting.title}
                </h1>
                {meeting.meeting_type && (
                  <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand-dark">
                    {meetingTypeLabel(meeting.meeting_type, locale)}
                  </span>
                )}
              </div>

              {editingMeeting && meetingEditor.draft ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2 text-sm font-medium text-gray-700">
                    {copy.title}
                    <input
                      value={meetingEditor.draft.title}
                      onChange={(event) =>
                        meetingEditor.patchDraft({ title: event.target.value })
                      }
                      className={`${inputClass} mt-1`}
                    />
                  </label>
                  <label className="sm:col-span-2 text-sm font-medium text-gray-700">
                    {copy.objective}
                    <textarea
                      value={meetingEditor.draft.objective ?? ''}
                      onChange={(event) =>
                        meetingEditor.patchDraft({ objective: event.target.value })
                      }
                      rows={3}
                      className={`${inputClass} mt-1`}
                    />
                  </label>
                  <MeetingInput
                    label={copy.date}
                    type="date"
                    value={meetingEditor.draft.meeting_date}
                    onChange={(meeting_date) => meetingEditor.patchDraft({ meeting_date })}
                  />
                  <MeetingInput
                    label={copy.place}
                    value={meetingEditor.draft.location ?? ''}
                    onChange={(location) => meetingEditor.patchDraft({ location })}
                  />
                  <MeetingInput
                    label={copy.start}
                    type="time"
                    value={meetingEditor.draft.start_time?.slice(0, 5) ?? ''}
                    onChange={(start_time) => meetingEditor.patchDraft({ start_time })}
                  />
                  <MeetingInput
                    label={copy.end}
                    type="time"
                    value={meetingEditor.draft.end_time?.slice(0, 5) ?? ''}
                    onChange={(end_time) => meetingEditor.patchDraft({ end_time })}
                  />
                  <label className="text-sm font-medium text-gray-700">
                    {copy.type}
                    <select
                      value={meetingEditor.draft.meeting_type ?? ''}
                      onChange={(event) =>
                        meetingEditor.patchDraft({
                          meeting_type: (event.target.value || null) as Meeting['meeting_type'],
                        })
                      }
                      className={`${inputClass} mt-1`}
                    >
                      <option value="">Sin tipo</option>
                      {MEETING_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>{meetingTypeLabel(type, locale)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    {copy.modality}
                    <select
                      value={meetingEditor.draft.modality ?? ''}
                      onChange={(event) =>
                        meetingEditor.patchDraft({
                          modality: (event.target.value || null) as Meeting['modality'],
                        })
                      }
                      className={`${inputClass} mt-1`}
                    >
                      <option value="">Sin modalidad</option>
                      {MEETING_MODALITY_OPTIONS.map((modality) => (
                        <option key={modality} value={modality}>{meetingModalityLabel(modality, locale)}</option>
                      ))}
                    </select>
                  </label>
                  {meetingEditor.validation.ok === false && (
                    <p className="sm:col-span-2 text-sm text-red-600">
                      {Object.values(meetingEditor.validation.errors).join(' ')}
                    </p>
                  )}
                </div>
              ) : (
                <>

              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {companyName && <Detail label={copy.company} value={companyName} />}
                <Detail label={copy.date} value={meeting.meeting_date} />
                <Detail label={copy.schedule} value={formatSchedule(meeting)} />
                {meeting.modality && (
                  <Detail
                    label={copy.modality}
                    value={meetingModalityLabel(meeting.modality, locale)}
                  />
                )}
                {meeting.location && (
                  <Detail label={copy.place} value={meeting.location} />
                )}
              </dl>

              {meeting.objective && (
                <p className="mt-3 text-sm text-gray-600">
                  <span className="font-medium text-gray-700">{copy.objective}:</span>{' '}
                  {meeting.objective}
                </p>
              )}
              {meetingActivityLinked && (
                <div className="mt-3 flex w-fit items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/40">
                  <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">
                    {locale === 'es' ? 'Estado de reunión' : 'Meeting status'}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actividadEstadoStyle(meetingActivity?.estado)}`}>
                    {meetingActivity
                      ? taskStatusLabel(meetingActivity.estado, locale)
                      : locale === 'es' ? 'No disponible' : 'Unavailable'}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    {locale === 'es' ? 'Solo lectura · LILLY' : 'Read only · LILLY'}
                  </span>
                </div>
              )}
                </>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-2">
              {editingMeeting ? (
                <>
                  <button
                    onClick={saveMeeting}
                    disabled={!meetingEditor.validatedPayload || savingMeeting}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {savingMeeting ? copy.saving : copy.save}
                  </button>
                  <button
                    onClick={() => setEditingMeeting(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                  >
                    {copy.cancel}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditingMeeting(true)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  {copy.edit}
                </button>
              )}
              <button
                onClick={() => void downloadMeetingReport()}
                disabled={generatingReport}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {generatingReport ? copy.generating : copy.print}
              </button>
              <button
                onClick={() => void setMeetingStatus(meeting.status === 'activa' ? 'finalizada' : 'activa')}
                disabled={
                  sendingReport ||
                  (meeting.status === 'activa' &&
                    !meetingQuery.capabilities.canFinalize)
                }
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  meeting.status === 'activa'
                    ? 'bg-brand text-white hover:bg-brand-dark'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {meeting.status === 'activa'
                  ? copy.finalize
                  : copy.reopen}
              </button>
              <button
                onClick={() => void sendMeetingReport(meeting.status === 'activa')}
                disabled={sendingReport || !meetingQuery.capabilities.canFinalize}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {sendingReport ? copy.generating : meeting.status === 'activa' ? copy.finalizeAndSend : copy.sendReport}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
            {notice}
          </div>
        )}
        {!meetingActivityLinked && meetingQuery.capabilities.canMutateTopics && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            <p>{locale === 'es' ? 'La reunión está guardada, pero su Activity aún no está vinculada en LILLY.' : 'The meeting is saved, but its Activity is not linked in LILLY yet.'}</p>
            <button type="button" onClick={() => void retryMeetingActivity()} className="mt-2 rounded-lg bg-amber-700 px-3 py-2 font-medium text-white">
              {locale === 'es' ? 'Reintentar vínculo con LILLY' : 'Retry LILLY link'}
            </button>
          </div>
        )}

        {meetingQuery.partialErrors.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Parte de la información no pudo cargarse. Los datos disponibles se
            muestran sin asumir acceso ni integridad de las relaciones no
            verificadas.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <PeopleCard title={copy.invitees} people={invitees} />
          <PeopleCard title={copy.attendees} people={attendees} />
        </div>

        <section className="surface rounded-xl border p-4 shadow-sm">
          <h2 className="heading text-sm font-semibold">{copy.attendance}</h2>
          {meetingQuery.participants.length === 0 ? <p className="muted mt-2 text-sm">{copy.empty}</p> : (
            <div className="mt-3 divide-y divide-gray-100 dark:divide-slate-800">
              {meetingQuery.participants.map(({ profile }) => {
                if (!profile) return null
                const name = usuarioNombre(profile)
                const attended = meeting.participants.includes(name)
                return <div key={profile.id} className="flex items-center justify-between gap-4 py-2">
                  <span className="heading text-sm">{name}</span>
                  <div className="flex rounded-lg border border-gray-200 p-1 dark:border-slate-700">
                    <button type="button" onClick={() => void setAttendance(profile, true)} className={`rounded-md px-3 py-1 text-xs ${attended ? 'bg-emerald-700 text-white' : 'muted'}`}>{copy.attended}</button>
                    <button type="button" onClick={() => void setAttendance(profile, false)} className={`rounded-md px-3 py-1 text-xs ${!attended ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-white' : 'muted'}`}>{copy.absent}</button>
                  </div>
                </div>
              })}
            </div>
          )}
        </section>

        {/* Secciones del acta */}
        {MEETING_SECTIONS.map((section) => {
          const sectionText = locale === 'es' ? section : ({
            resumen: { label: 'Summary', description: 'Key points discussed' },
            decisiones: { label: 'Decisions', description: 'Agreements reached during the meeting' },
            proximos_pasos: { label: 'Tasks', description: 'Tasks linked to LILLY' },
            detalles: { label: 'Details', description: 'Additional notes and context' },
          } as const)[section.key]
          const sectionTopics = topics.filter((t) => t.section === section.key)
          const draft = drafts[section.key]
          const isNextSteps = section.key === 'proximos_pasos'
          return (
            <section
              key={section.key}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3">
                <h2 className="text-base font-semibold text-gray-900">
                  {sectionText.label}
                </h2>
                <p className="text-xs text-gray-400">{sectionText.description}</p>
                {isNextSteps && (
                  <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {locale === 'es' ? 'Estado de solo lectura · LILLY' : 'Read-only status · LILLY'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                {sectionTopics.length === 0 && (
                  <p className="text-sm text-gray-400">{copy.empty}</p>
                )}
                {sectionTopics.map((t) => {
                  const resp = t.responsable_id
                    ? usuariosById[t.responsable_id]
                    : null
                  return (
                    <TopicEditorRow
                      key={t.id}
                      topic={t}
                      meetingId={id}
                      responsable={resp ? usuarioNombre(resp) : null}
                      activityState={t.actividad_id ? meetingQuery.activityLinks[t.actividad_id]?.status : null}
                      activityStatus={t.actividad_id ? actividadEstados[t.actividad_id] : null}
                      activity={t.actividad_id ? activitiesById[t.actividad_id] : null}
                      organization={organization}
                      canMutate={meetingQuery.capabilities.canMutateTopics}
                      onSaved={meetingQuery.replaceTopic}
                      onActivitySaved={meetingQuery.replaceActivity}
                      onDelete={() => deletePoint(t)}
                      onDragStart={() => setDraggedTopicId(t.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => reorderTopic(section.key, t.id)}
                    />
                  )
                })}
              </div>

              <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 dark:border-slate-800">
                <input
                  value={draft.title}
                  onChange={(e) =>
                    updateDraft(section.key, { title: e.target.value })
                  }
                  placeholder={
                    isNextSteps ? copy.action : copy.point
                  }
                  className={inputClass}
                />
                <textarea
                  value={draft.description}
                  onChange={(e) =>
                    updateDraft(section.key, { description: e.target.value })
                  }
                  placeholder={copy.detail}
                  rows={2}
                  className={inputClass}
                />
                {isNextSteps && <TaskAssignmentFields
                  organization={organization}
                  departmentId={draft.departmentId}
                  teamId={draft.teamId}
                  assigneeId={draft.responsableId}
                  onDepartmentChange={(departmentId) => updateDraft(section.key, { departmentId, teamId: '', responsableId: '' })}
                  onTeamChange={(teamId) => updateDraft(section.key, { teamId, responsableId: '' })}
                  onAssigneeChange={(responsableId) => updateDraft(section.key, { responsableId })}
                />}
                {isNextSteps && <input type="date" value={draft.deadline} onChange={(event) => updateDraft(section.key, { deadline: event.target.value })} className={inputClass} aria-label={copy.due} />}
                <button
                  onClick={() => addPoint(section.key)}
                  disabled={
                    !meetingQuery.capabilities.canMutateTopics ||
                    (isNextSteps &&
                      Boolean(draft.responsableId) &&
                      !meetingQuery.capabilities.canCreateActivity)
                  }
                  className="rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:border-brand hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + {copy.add} {sectionText.label}
                </button>
              </div>
            </section>
          )
        })}
      </div>

      {/* ------- Acta imprimible (solo al imprimir) ------- */}
      <ActaPrint
        meeting={meeting}
        companyName={companyName}
        invitees={invitees}
        attendees={attendees}
        topics={topics}
        usuariosById={usuariosById}
        actividadEstados={actividadEstados}
      />
    </>
  )
}

function PeopleCard({
  title,
  people,
}: {
  title: string
  people: PrintParticipant[]
}) {
  return (
    <section className="surface rounded-xl border p-4 shadow-sm">
      <h2 className="heading text-sm font-semibold">{title}</h2>
      {people.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400">Sin registros.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-gray-600">
          {people.map((person, index) => (
            <li key={`${person.nombre}-${index}`}>{person.nombre}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

function MeetingInput({
  label,
  value,
  type = 'text',
  onChange,
}: {
  label: string
  value: string
  type?: 'text' | 'date' | 'time'
  onChange: (value: string) => void
}) {
  return (
    <label className="text-sm font-medium text-gray-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} mt-1`}
      />
    </label>
  )
}

function TopicEditorRow({
  topic,
  meetingId,
  responsable,
  activityState,
  activityStatus,
  activity,
  organization,
  canMutate,
  onSaved,
  onActivitySaved,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  topic: Topic
  meetingId: string
  responsable: string | null
  activityState: 'available' | 'unresolved' | 'inaccessible' | null | undefined
  activityStatus: string | null | undefined
  activity: CanonicalTaskRecord | null | undefined
  organization: TaskOrganization
  canMutate: boolean
  onSaved: (topic: Topic) => void
  onActivitySaved: (activity: CanonicalTaskRecord) => void
  onDelete: () => void
  onDragStart: () => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDrop: () => void
}) {
  const { locale } = usePreferences()
  const rowCopy = locale === 'es' ? {
    saving: 'Guardando…', save: 'Guardar', cancel: 'Cancelar', title: 'Título del punto', content: 'Contenido del punto', assignee: 'Responsable', currentAssignee: 'Responsable actual (no elegible)', noTeam: 'Sin equipo', noDepartment: 'Sin departamento', crmStatus: 'Estado administrado por el CRM', company: 'Empresa de la Task', due: 'Fecha límite de la Task', conflict: 'La Task cambió en el CRM. Tus cambios no se enviaron.', loadCrm: 'Cargar versión actual del CRM', drag: 'Arrastrar para reordenar', unassigned: 'sin asignar', unavailable: 'Activity no disponible — vínculo o permisos NOT VERIFIED', pendingSend: 'Pendiente de enviar', noDue: 'sin definir', saveAssignee: 'Guardar responsable', editDue: 'Editar fecha límite', saveDue: 'Guardar fecha', edit: 'Editar', dueButton: 'Fecha límite', cannotDelete: 'No se puede eliminar: tiene una Activity vinculada', deletePoint: 'Eliminar punto',
  } : {
    saving: 'Saving…', save: 'Save', cancel: 'Cancel', title: 'Item title', content: 'Item content', assignee: 'Assignee', currentAssignee: 'Current assignee (not eligible)', noTeam: 'No team', noDepartment: 'No department', crmStatus: 'Status managed by LILLY', company: 'Task company', due: 'Task due date', conflict: 'The Task changed in LILLY. Your changes were not submitted.', loadCrm: 'Load current LILLY version', drag: 'Drag to reorder', unassigned: 'unassigned', unavailable: 'Activity unavailable — link or permissions NOT VERIFIED', pendingSend: 'Pending submission', noDue: 'not set', saveAssignee: 'Save assignee', editDue: 'Edit due date', saveDue: 'Save date', edit: 'Edit', dueButton: 'Due date', cannotDelete: 'Cannot delete: an Activity is linked', deletePoint: 'Delete item',
  }
  const editor = useTopicsEditor(topic)
  const taskEditor = useTaskEditor(activity)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState(false)
  const currentAssignee = organization.assignees.find(
    (item) => item.id === activity?.responsable_id
  )
  const currentUser = organization.users.find(
    (item) => item.id === activity?.responsable_id
  ) ?? (activity?.responsable ? {
    id: activity.responsable.id,
    nombre_display: activity.responsable.nombre,
    nombre: null,
    apellido: null,
    activo: false,
    equipo_id: activity.equipo?.id ?? null,
  } : undefined)
  const currentTeam = organization.teams.find(
    (item) => item.id === currentUser?.equipo_id
  )
  const currentDepartment = organization.departments.find(
    (item) => item.id === currentTeam?.departamento_id
  )
  const [departmentId, setDepartmentId] = useState(
    currentDepartment?.id ??
      (currentUser && !currentUser.equipo_id ? NO_ORGANIZATION : '')
  )
  const [teamId, setTeamId] = useState(
    currentTeam?.id ??
      (currentUser && !currentUser.equipo_id ? NO_ORGANIZATION : '')
  )
  const [assigneeId, setAssigneeId] = useState(
    activity?.responsable_id ?? topic.responsable_id ?? ''
  )
  const [deadline, setDeadline] = useState(
    activity?.fecha_entrega ?? ''
  )
  const isNextStep = topic.section === 'proximos_pasos'

  useEffect(() => {
    setDeadline(activity?.fecha_entrega ?? '')
  }, [activity?.fecha_entrega])

  useEffect(() => {
    const selected = organization.users.find(
      (item) => item.id === activity?.responsable_id
    )
    const selectedTeam = organization.teams.find(
      (item) => item.id === selected?.equipo_id
    )
    setAssigneeId(activity?.responsable_id ?? topic.responsable_id ?? '')
    setDepartmentId(
      organization.departments.find(
        (item) => item.id === selectedTeam?.departamento_id
      )?.id ??
        (selected && !selected.equipo_id ? NO_ORGANIZATION : '')
    )
    setTeamId(
      selectedTeam?.id ??
        (selected && !selected.equipo_id ? NO_ORGANIZATION : '')
    )
  }, [
    activity?.responsable_id,
    organization.departments,
    organization.teams,
    organization.users,
    topic.responsable_id,
  ])

  function handleTaskError(caught: unknown, fallback: string) {
    if (isTaskConflict(caught)) {
      onActivitySaved(caught.current)
      taskEditor.markConflict(caught.current)
      setRowError('La Task cambió en el CRM. Revisa la versión actual antes de volver a editar.')
      return
    }
    setRowError(caught instanceof Error ? caught.message : fallback)
  }

  async function save() {
    setSaving(true)
    setRowError(null)
    if (isNextStep && activity) {
      if (!taskEditor.validatedPayload) {
        setSaving(false)
        setRowError(taskEditor.error ?? 'Los datos de la Task no son válidos.')
        return
      }
      try {
        const saved = await updateTask(activity.id, taskEditor.validatedPayload)
        taskEditor.accept(saved)
        onActivitySaved(saved)
        await recordMeetingEvent(meetingId, 'task_updated', `Task modificada: ${saved.titulo}`, { activity_id: saved.id })
        setEditing(false)
      } catch (caught) {
        handleTaskError(caught, 'No se actualizó la Task.')
      } finally {
        setSaving(false)
      }
      return
    }
    if (!editor.validatedPayload) { setSaving(false); return }
    const result = await updateTopicEditorial(topic.id, editor.validatedPayload)
    setSaving(false)
    if (result.ok === false) {
      setRowError(result.error.message)
      return
    }
    editor.acceptSaved(result.data)
    onSaved(result.data)
    await recordMeetingEvent(meetingId, 'meeting_updated', `Se modificó un punto: ${result.data.title}`, { topic_id: result.data.id })
    setEditing(false)
  }

  async function saveDeadline() {
    if (!activity) return
    const currentDeadline = activity.fecha_entrega ?? ''
    if (deadline === currentDeadline) {
      setEditingDeadline(false)
      return
    }
    setSaving(true)
    setRowError(null)
    try {
      const saved = await updateTask(activity.id, { expected_updated_at: activity.updated_at, fecha_entrega: deadline || null })
      onActivitySaved(saved); taskEditor.accept(saved); setEditingDeadline(false)
      await recordMeetingEvent(meetingId, 'task_updated', `Fecha de entrega actualizada: ${saved.titulo}`, { activity_id: saved.id })
    } catch (caught) { handleTaskError(caught, 'No se actualizó la fecha límite.') }
    finally { setSaving(false) }
  }

  async function saveAssignment() {
    if (!activity || !assigneeId || assigneeId === activity.responsable_id) {
      setEditingAssignment(false)
      return
    }
    setSaving(true)
    setRowError(null)
    try {
      const saved = await updateTask(activity.id, { expected_updated_at: activity.updated_at, responsable_id: assigneeId })
      onActivitySaved(saved); taskEditor.accept(saved); setEditingAssignment(false)
      await recordMeetingEvent(meetingId, 'task_updated', `Responsable actualizado: ${saved.titulo}`, { activity_id: saved.id })
    } catch (caught) { handleTaskError(caught, 'No se actualizó el responsable.') }
    finally { setSaving(false) }
  }

  return (
    <div
      draggable={canMutate && !editing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="rounded-lg border border-gray-200 p-3 dark:border-slate-700"
    >
      {editing && (isNextStep && activity ? taskEditor.draft : editor.draft) ? (
        <div className="space-y-2">
          <input
            value={isNextStep && activity ? taskEditor.draft?.titulo ?? '' : editor.draft?.title ?? ''}
            onChange={(event) => isNextStep && activity ? taskEditor.patch({ titulo: event.target.value }) : editor.patchDraft({ title: event.target.value })}
            className={inputClass}
            aria-label={rowCopy.title}
          />
          <textarea
            value={isNextStep && activity ? taskEditor.draft?.descripcion ?? '' : editor.draft?.description ?? ''}
            onChange={(event) => isNextStep && activity ? taskEditor.patch({ descripcion: event.target.value }) : editor.patchDraft({ description: event.target.value })}
            rows={3}
            className={inputClass}
            aria-label={rowCopy.content}
          />
          {isNextStep && activity && taskEditor.draft && (
            <>
              <select value={taskEditor.draft.responsable_id} onChange={(event) => taskEditor.patch({ responsable_id: event.target.value })} className={inputClass} aria-label={rowCopy.assignee}>
                {!organization.assignees.some((item) => item.id === activity.responsable_id) && activity.responsable && (
                  <option value={activity.responsable_id} disabled>{activity.responsable.nombre} — {rowCopy.currentAssignee}</option>
                )}
                {organization.assignees.map((item) => <option key={item.id} value={item.id}>{usuarioNombre(item)} · {item.equipo?.nombre ?? rowCopy.noTeam} · {item.departamento?.nombre ?? rowCopy.noDepartment}</option>)}
              </select>
              <label className="block text-xs font-medium text-gray-600">
                {rowCopy.crmStatus}
                <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 ${actividadEstadoStyle(activity.estado)}`}>{taskStatusLabel(activity.estado, locale)}</span>
              </label>
              <select value={taskEditor.draft.empresa} onChange={(event) => taskEditor.patch({ empresa: event.target.value })} className={inputClass} aria-label={rowCopy.company}>
                {organization.companies.map((company) => <option key={company.id} value={company.codigo}>{company.nombre}</option>)}
              </select>
              <input type="date" value={taskEditor.draft.fecha_entrega} onChange={(event) => taskEditor.patch({ fecha_entrega: event.target.value })} className={inputClass} aria-label={rowCopy.due} />
              {taskEditor.conflict && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                  <p>{rowCopy.conflict}</p>
                  <button
                    type="button"
                    onClick={() => {
                      taskEditor.acceptConflict()
                      setRowError(null)
                    }}
                    className="mt-2 rounded-md border border-amber-300 bg-white px-2 py-1 font-medium"
                  >
                    {rowCopy.loadCrm}
                  </button>
                </div>
              )}
            </>
          )}
          {!isNextStep && editor.validation.ok === false && (
            <p className="text-xs text-red-600">
              {Object.values(editor.validation.errors).join(' ')}
            </p>
          )}
          {rowError && <p className="text-xs text-red-600">{rowError}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={(isNextStep && activity ? !taskEditor.validatedPayload || taskEditor.conflict : !editor.validatedPayload) || saving}
              className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {saving ? rowCopy.saving : rowCopy.save}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600"
            >
              {rowCopy.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <span
            aria-label={rowCopy.drag}
            title={rowCopy.drag}
            className="cursor-grab select-none text-gray-300"
          >
            ⋮⋮
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{isNextStep && activity ? activity.titulo : topic.title}</p>
            {(isNextStep && activity ? activity.descripcion : topic.description) && (
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-500">
                {isNextStep && activity ? activity.descripcion : topic.description}
              </p>
            )}
            {isNextStep && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-gray-500">
                  {rowCopy.assignee}: {responsable ?? rowCopy.unassigned}
                </span>
                {currentAssignee && (
                  <span className="text-gray-500">
                    {currentAssignee.equipo?.nombre ?? rowCopy.noTeam} ·{' '}
                    {currentAssignee.departamento?.nombre ?? rowCopy.noDepartment}
                  </span>
                )}
                {topic.actividad_id && activityState === 'available' ? (
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${actividadEstadoStyle(
                      activityStatus
                    )}`}
                  >
                    {taskStatusLabel(activityStatus, locale)}
                  </span>
                ) : topic.actividad_id ? (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">
                    {rowCopy.unavailable}
                  </span>
                ) : topic.responsable_id ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                    {rowCopy.pendingSend}
                  </span>
                ) : null}
                {activity && (
                  <span className="text-gray-500">
                    {rowCopy.dueButton}:{' '}
                    {activity.fecha_entrega ?? rowCopy.noDue}
                  </span>
                )}
              </div>
            )}
            {editingAssignment && activity && (
              <div className="mt-2 space-y-2">
                <TaskAssignmentFields
                  organization={organization}
                  departmentId={departmentId}
                  teamId={teamId}
                  assigneeId={assigneeId}
                  currentAssignee={currentUser}
                  onDepartmentChange={setDepartmentId}
                  onTeamChange={setTeamId}
                  onAssigneeChange={setAssigneeId}
                  disabled={saving}
                />
                <button
                  onClick={saveAssignment}
                  disabled={saving || !assigneeId}
                  className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {rowCopy.saveAssignee}
                </button>
              </div>
            )}
            {editingDeadline && activity && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                  className={inputClass}
                  aria-label={rowCopy.editDue}
                />
                <button
                  onClick={saveDeadline}
                  disabled={saving}
                  className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {rowCopy.saveDue}
                </button>
              </div>
            )}
            {rowError && !editing && (
              <p className="mt-1 text-xs text-red-600">{rowError}</p>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={() => setEditing(true)}
              disabled={!canMutate}
              className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40"
            >
              {rowCopy.edit}
            </button>
            {activity && isNextStep && (
              <button
                onClick={() => setEditingAssignment((current) => !current)}
                className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
              >
                {rowCopy.assignee}
              </button>
            )}
            {activity && isNextStep && (
              <button
                onClick={() => setEditingDeadline((current) => !current)}
                className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
              >
                {rowCopy.dueButton}
              </button>
            )}
            <button
              onClick={onDelete}
              disabled={isNextStep || !canDeleteTopic(topic) || !canMutate}
              title={
                topic.actividad_id
                  ? rowCopy.cannotDelete
                  : rowCopy.deletePoint
              }
              className="rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="text-gray-700">{value}</dd>
    </div>
  )
}

function QueryMessage({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
      <p>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-md bg-brand px-3 py-1.5 font-medium text-white"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}

function formatSchedule(meeting: Meeting): string {
  const start = meeting.start_time?.slice(0, 5)
  const end = meeting.end_time?.slice(0, 5)
  if (start && end) return `${start} – ${end}`
  return start ?? '—'
}
