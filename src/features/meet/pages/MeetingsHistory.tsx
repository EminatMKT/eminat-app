'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/shared/db/supabase'
import { listTasks } from '@/features/meet/lib/services/task-api'
import { loadMeetingListAndTasks } from '@/features/meet/lib/services/meeting-list-load'
import {
  actividadEstadoStyle,
  meetingTypeLabel,
  taskStatusLabel,
  type Meeting,
} from '@/features/meet/lib/types'
import { usePreferences } from '@/features/meet/lib/preferences'

type MeetingWithCompany = Meeting & { empresas?: { nombre: string } | null }

/** Tarea del CRM generada desde una reunión (topic.actividad_id -> actividades). */
type TrackedTask = {
  actividadId: string
  titulo: string
  estado: string
  responsable: string | null
  meetingId: string
}

export default function HistoryPage() {
  const { locale } = usePreferences()
  const copy = locale === 'es' ? {
    title: 'Historial de reuniones', intro: 'Revisa sesiones pasadas y consulta las Tasks administradas por el CRM.', tracking: 'Seguimiento de Tasks', onlyPending: 'Solo no completadas', emptyTasks: 'No hay Tasks que mostrar con el filtro actual.', assignee: 'Responsable', meeting: 'Reunión', finished: 'Reuniones finalizadas', emptyMeetings: 'Todavía no hay reuniones finalizadas.', task: 'Task', tasks: 'Tasks', incomplete: 'sin completar',
  } : {
    title: 'Meeting history', intro: 'Review past sessions and the Tasks managed in StratixCRM.', tracking: 'Task tracking', onlyPending: 'Incomplete only', emptyTasks: 'No Tasks match the current filter.', assignee: 'Assignee', meeting: 'Meeting', finished: 'Finalized meetings', emptyMeetings: 'There are no finalized meetings yet.', task: 'Task', tasks: 'Tasks', incomplete: 'incomplete',
  }
  const [meetings, setMeetings] = useState<MeetingWithCompany[]>([])
  const [tasks, setTasks] = useState<TrackedTask[]>([])
  const [onlyPending, setOnlyPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setError(null)
      const loaded = await loadMeetingListAndTasks<MeetingWithCompany, Awaited<ReturnType<typeof listTasks>>>(
        supabase
          .from('meetings')
          .select('*, empresas!meetings_company_id_fkey(nombre)')
          .order('meeting_date', { ascending: false })
          .order('start_time', { ascending: false }),
        listTasks(),
      )
      if (!active) return
      setMeetings(loaded.meetings)
      setError(loaded.meetingError ?? loaded.taskError)

      setTasks((loaded.tasks?.tasks ?? []).flatMap((task) => task.meeting ? [{
          actividadId: task.id,
          titulo: task.titulo,
          estado: task.estado,
          responsable: task.responsable?.nombre ?? null,
          meetingId: task.meeting.id,
        }] : []))
      setLoading(false)
    }

    void load().catch((caught) => {
      if (!active) return
      setError(caught instanceof Error ? caught.message : 'No se pudieron cargar las Tasks del CRM.')
      setLoading(false)
    })
    const refresh = () => { void load() }
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const meetingsById = useMemo(
    () => Object.fromEntries(meetings.map((m) => [m.id, m])),
    [meetings]
  )
  const pastMeetings = useMemo(
    () => meetings.filter((m) => m.status === 'finalizada'),
    [meetings]
  )

  const visibleTasks = tasks.filter((t) =>
    onlyPending ? t.estado !== 'Completado' : true
  )

  if (loading) return <p className="text-gray-500">{locale === 'es' ? 'Cargando…' : 'Loading…'}</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {copy.title}
        </h1>
        <p className="text-sm text-gray-500">
          {copy.intro}
        </p>
      </div>

      {/* Seguimiento de tareas del CRM */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {copy.tracking}
          </h2>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={onlyPending}
              onChange={(e) => setOnlyPending(e.target.checked)}
              className="rounded border-gray-300 text-brand focus:ring-brand"
            />
            {copy.onlyPending}
          </label>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 space-y-2">
          {visibleTasks.length === 0 && !error ? (
            <p className="text-sm text-gray-400">
              {copy.emptyTasks}
            </p>
          ) : (
            visibleTasks.map((t) => {
              const origin = meetingsById[t.meetingId]
              return (
                <div
                  key={t.actividadId}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-200 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {t.titulo}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {t.responsable && (
                        <span>
                          <span className="font-medium">{copy.assignee}:</span>{' '}
                          {t.responsable}
                        </span>
                      )}
                      {origin && (
                        <span>
                          <span className="font-medium">{copy.meeting}:</span>{' '}
                          {origin.title} · {origin.meeting_date}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${actividadEstadoStyle(
                        t.estado
                      )}`}
                    >
                      {taskStatusLabel(t.estado, locale)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Reuniones finalizadas */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          {copy.finished}
        </h2>
        {pastMeetings.length === 0 && !error ? (
          <p className="text-sm text-gray-400">
            {copy.emptyMeetings}
          </p>
        ) : (
          <div className="space-y-2">
            {pastMeetings.map((m) => {
              const mt = tasks.filter((t) => t.meetingId === m.id)
              const count = mt.length
              const pending = mt.filter((t) => t.estado !== 'Completado').length
              return (
                <Link
                  key={m.id}
                  href={`/meetings/${m.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{m.title}</h3>
                      {m.meeting_type && (
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand-dark">
                          {meetingTypeLabel(m.meeting_type, locale)}
                        </span>
                      )}
                    </div>
                    {m.empresas?.nombre && (
                      <p className="text-sm font-medium text-gray-600">
                        {m.empresas.nombre}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      {m.meeting_date} · {m.start_time?.slice(0, 5)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>
                      {count} {count === 1 ? copy.task : copy.tasks}
                    </p>
                    {pending > 0 && (
                      <p className="font-medium text-amber-600">
                        {pending} {copy.incomplete}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
