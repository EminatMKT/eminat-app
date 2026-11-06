'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { meetingDisplayCopy } from '../lib/display-copy'
import styles from '../components/MeetingOverview.module.css'
import { supabase } from '@/shared/db/supabase'
import { listMeetingOverview } from '@/features/meet/lib/services/task-api'
import type { MeetingOverview } from '@/app/api/integrations/meet/_shared/contracts'
import { useApp } from '@/shared/context/AppContext'
import { overviewRead, overviewRefresh } from '../lib/services/overview-refresh'
import { overviewModel } from '../lib/services/overview-model'
import { splitMeetingHistory } from '@/features/meet/lib/meeting-view'
import { listLatestMeetingEvents, type MeetingEvent } from '@/features/meet/lib/services/meeting-history'
import { usePreferences } from '@/features/meet/lib/preferences'
import {
  actividadEstadoStyle,
  meetingTypeLabel,
  taskStatusLabel,
  type Meeting,
} from '@/features/meet/lib/types'

type MeetingWithCompany = Meeting & { empresas?: { nombre: string } | null }
type MeetingTask = {
  id: string
  titulo: string
  estado: string | null
  responsable: string | null
}

export default function HomePage() {
  const { t, locale } = usePreferences()
  const [meetings, setMeetings] = useState<MeetingWithCompany[]>([])
  const { usuario } = useApp()
  const authId = usuario?.auth_id ?? ''
  const [summary, setSummary] = useState<MeetingOverview | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [team, setTeam] = useState<string | null>(null)
  const [department, setDepartment] = useState<string | null>(null)
  const [company, setCompany] = useState<string | null>(null)
  const [latestEvents, setLatestEvents] = useState<Record<string, MeetingEvent>>({})
  const [creators, setCreators] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!authId) return
    let current = true
    const key = `meetings-overview:${authId}`
    setMeetings([])
    setSummary(null)
    setLoading(true)
    setSummaryLoading(true)
    setLoadError(null)
    setSummaryError(null)
    setName('')
    setTeam(null)
    setDepartment(null)
    setCompany(null)
    setCreators({})
    setLatestEvents({})
    const message = (error: unknown) => error instanceof Error ? error.message : String(error)

    async function loadMeetings() {
      try {
        const rows = await overviewRead(`${key}:meetings`, async () => {
          const rows: MeetingWithCompany[] = []
          for (let offset = 0; ; offset += 500) {
            const result = await supabase.from('meetings').select('*, empresas!meetings_company_id_fkey(nombre)')
              .order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 499)
            if (result.error) throw new Error(result.error.message)
            const page = (result.data ?? []) as MeetingWithCompany[]
            rows.push(...page)
            if (page.length < 500) return rows
          }
        })
        if (!current) return
        setMeetings(rows)
        setLoadError(null)
        setLoading(false)
        // Neither card rendering nor summary loading waits for these decorations.
        const creatorIds = Array.from(new Set(rows.map(row => row.user_id)))
        await Promise.allSettled([
          overviewRead(`${key}:creators:${creatorIds.join(',')}`, async () => {
            if (!creatorIds.length) return {}
            const result = await supabase.from('usuarios').select('auth_id, nombre_display, nombre, apellido').in('auth_id', creatorIds)
            if (result.error) throw new Error(result.error.message)
            return Object.fromEntries((result.data ?? []).map(profile => [profile.auth_id, profile.nombre_display || `${profile.nombre ?? ''} ${profile.apellido ?? ''}`.trim()]))
          }).then(data => { if (current) setCreators(data) }),
          overviewRead(`${key}:events:${rows.map(row => row.id).join(',')}`, () => listLatestMeetingEvents(rows.map(row => row.id)))
            .then(data => { if (current) setLatestEvents(data) }),
        ])
      } catch (error) {
        if (current) { setLoadError(message(error)); setLoading(false) }
      }
    }
    async function loadSummary() {
      if (current) setSummaryLoading(true)
      try {
        const data = await overviewRead(`${key}:summary`, () => listMeetingOverview(authId))
        if (!current) return
        setSummary(data)
        setSummaryError(null)
        setTeam(data.header.team)
        setDepartment(data.header.department)
        setCompany(data.header.company)
      } catch (error) {
        if (current) setSummaryError(message(error))
      } finally { if (current) setSummaryLoading(false) }
    }
    async function loadName() {
      const result = await overviewRead(`${key}:name`, () => supabase.auth.getUser())
      if (current && result.data.user?.id === authId) setName((result.data.user.user_metadata?.full_name as string | undefined) || result.data.user.email?.split('@')[0] || '')
    }
    const refresh = overviewRefresh(() => Promise.allSettled([loadMeetings(), loadSummary(), loadName()]), error => {
      if (current) setLoadError(message(error))
    })
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh.activation() }
    refresh.trigger()
    window.addEventListener('focus', refresh.activation)
    document.addEventListener('visibilitychange', onVisibility)
    const timer = window.setInterval(refresh.trigger, 30000)
    return () => {
      current = false
      refresh.dispose()
      window.removeEventListener('focus', refresh.activation)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(timer)
    }
  }, [authId])

  const { byMeeting: tasksByMeeting, statusByMeeting: meetingActivityByMeeting } = summary ? overviewModel(summary) : { byMeeting: {}, statusByMeeting: {} }
  const summaryState = summaryError ? 'error' : summary === null ? 'loading' : 'ready'

  const { active, finished } = splitMeetingHistory(meetings)

  return (
    <div className={`${styles.page} space-y-8`} data-meetings-list-ready={!loading && !loadError} data-meetings-summary-ready={summary !== null && !summaryError && !summaryLoading}>
      <section className="rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-brand p-7 text-white shadow-xl shadow-emerald-950/10">
        <p className="text-sm font-medium text-emerald-100">{t('welcome')}</p>
        <h1 className="mt-1 text-3xl font-bold">{t('hello')}{name ? `, ${name}` : ''}, {t('welcomePerson')}</h1>
        {(team || department || company) && <div className="mt-5 flex flex-wrap gap-2 text-sm">
          {(team || department) && <span className="rounded-full bg-white/15 px-3 py-1.5">{t('team')}: {[team, department].filter(Boolean).join(' / ')}</span>}
          {company && <span className="rounded-full bg-white/15 px-3 py-1.5">{t('company')}: {company}</span>}
        </div>}
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="heading text-2xl font-bold">{t('meetings')}</h1>
          <p className="text-sm text-gray-500">
            {t('welcome')}
          </p>
        </div>
        <Link
          href="/meetings/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + {t('newMeeting')}
        </Link>
      </div>

      {summaryError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{locale === 'es' ? 'No se pudieron actualizar las Tasks: ' : 'Task summaries could not be refreshed: '}{summaryError}</p>}
      {loadError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}
      {loading ? (
        <p className="text-gray-500">{t('loading')}</p>
      ) : meetings.length === 0 && !loadError ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">{locale === 'es' ? 'Aún no tienes reuniones.' : 'You do not have any meetings yet.'}</p>
          <Link
            href="/meetings/new"
            className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            {locale === 'es' ? 'Crear la primera' : 'Create the first one'}
          </Link>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <Section
              title={t('active')}
              meetings={active}
              tasksByMeeting={tasksByMeeting}
              meetingActivityByMeeting={meetingActivityByMeeting}
              latestEvents={latestEvents}
              creators={creators}
              summaryState={summaryState}
            />
          )}
          {finished.length > 0 && (
            <Section
              title={t('finished')}
              meetings={finished}
              tasksByMeeting={tasksByMeeting}
              meetingActivityByMeeting={meetingActivityByMeeting}
              latestEvents={latestEvents}
              creators={creators}
              summaryState={summaryState}
            />
          )}
        </>
      )}
    </div>
  )
}

function Section({
  title,
  meetings,
  tasksByMeeting,
  meetingActivityByMeeting,
  latestEvents,
  creators,
  summaryState,
}: {
  title: string
  meetings: MeetingWithCompany[]
  tasksByMeeting: Record<string, MeetingTask[]>
  meetingActivityByMeeting: Record<string, MeetingTask | null>
  latestEvents: Record<string, MeetingEvent>
  creators: Record<string, string>
  summaryState: 'loading' | 'error' | 'ready'
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {meetings.map((m) => (
          <MeetingCard
            key={m.id}
            meeting={m}
            tasks={tasksByMeeting[m.id] ?? []}
            meetingActivity={meetingActivityByMeeting[m.id]}
            latestEvent={latestEvents[m.id]}
            creator={creators[m.user_id]}
            summaryState={summaryState}
          />
        ))}
      </div>
    </div>
  )
}

function shortTitle(titulo: string): string {
  return titulo.length > 22 ? `${titulo.slice(0, 22)}…` : titulo
}

function MeetingCard({
  meeting,
  tasks,
  meetingActivity,
  latestEvent,
  creator,
  summaryState,
}: {
  meeting: MeetingWithCompany
  tasks: MeetingTask[]
  meetingActivity?: MeetingTask | null
  latestEvent?: MeetingEvent
  creator?: string
  summaryState: 'loading' | 'error' | 'ready'
}) {
  const { t, formatDate, locale } = usePreferences()
  const start = meeting.start_time?.slice(0, 5)
  const end = meeting.end_time?.slice(0, 5)
  const schedule = start && end ? `${start} – ${end}` : start
  return (
    <article data-meeting-id={meeting.id} className="surface rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900">{meeting.title}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            meeting.status === 'activa'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {meeting.status === 'activa' ? t('active') : t('finished')}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        {meeting.empresas?.nombre && (
          <span className="text-sm font-medium text-gray-600">
            {meeting.empresas.nombre}
          </span>
        )}
        {meeting.meeting_type && (
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand-dark">
            {meetingTypeLabel(meeting.meeting_type, locale)}
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-gray-500">
        {meeting.meeting_date} · {schedule}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
        <span>{t('created')}: {formatDate(meeting.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</span>
        <span>{t('updated')}: {formatDate(meeting.updated_at, { dateStyle: 'medium', timeStyle: 'short' })}</span>
      </div>
      {creator && <p className="mt-2 text-xs text-gray-500">{t('createdBy')}: <span className="font-medium">{creator}</span></p>}

      {summaryState !== 'ready' && <p role="status" className="mt-3 text-xs text-gray-500">{summaryState === 'loading' ? (locale === 'es' ? 'Cargando Tasks…' : 'Loading Tasks…') : (locale === 'es' ? 'Tasks no disponibles' : 'Tasks unavailable')}</p>}
      {summaryState === 'ready' && meetingActivity !== undefined && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2">
          <span className="text-xs font-semibold text-emerald-900">
            {locale === 'es' ? 'Estado de reunión' : 'Meeting status'}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actividadEstadoStyle(meetingActivity?.estado)}`}>
            {meetingActivity
              ? taskStatusLabel(meetingActivity.estado, locale)
              : locale === 'es' ? 'No disponible' : 'Unavailable'}
          </span>
        </div>
      )}

      {/* Desglose de tareas generadas en el CRM */}
      {summaryState === 'ready' && tasks.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          <p className="text-xs font-medium text-gray-500">
            {tasks.length} {locale === 'es' ? `Task${tasks.length === 1 ? '' : 's'} generada${tasks.length === 1 ? '' : 's'}` : `generated Task${tasks.length === 1 ? '' : 's'}`}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {tasks.map((t) => (
              <span
                key={t.id}
                title={t.titulo}
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${actividadEstadoStyle(
                  t.estado
                )}`}
              >
                {shortTitle(t.titulo)}: {taskStatusLabel(t.estado, locale)}
                {t.responsable ? ` (${t.responsable})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {summaryState === 'ready' && tasks.length === 0 && meeting.participants.length > 0 && (
        <p className="mt-2 truncate text-xs text-gray-400">
          {meeting.participants.join(', ')}
        </p>
      )}
      <div className="mt-4 border-t border-gray-100 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('lastActivity')}</p>
        <p className="mt-1 text-sm text-gray-500">{latestEvent ? `${meetingDisplayCopy(latestEvent.summary)}${typeof latestEvent.metadata.actor_name === 'string' ? ` · ${latestEvent.metadata.actor_name}` : ''} · ${formatDate(latestEvent.created_at, { dateStyle: 'medium', timeStyle: 'short' })}` : t('noActivity')}</p>
        <div className="mt-3 flex gap-4">
          <Link href={`/meetings/${meeting.id}`} className="text-sm font-semibold text-brand">{t('viewMeeting')} →</Link>
          <Link href={`/meetings/${meeting.id}/history`} className="text-sm font-semibold text-gray-500">{t('viewHistory')}</Link>
        </div>
      </div>
    </article>
  )
}
