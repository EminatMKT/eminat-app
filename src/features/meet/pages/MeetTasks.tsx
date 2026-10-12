'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { listTasks } from '@/features/meet/lib/services/task-api'
import { visibleMeetTasks, type TaskScope } from '@/features/meet/lib/meeting-view'
import { actividadEstadoStyle, taskStatusLabel, type CanonicalTaskListItem } from '@/features/meet/lib/types'
import { usePreferences } from '@/features/meet/lib/preferences'

export default function TasksPage() {
  const { t, formatDate, locale } = usePreferences()
  const [scope, setScope] = useState<TaskScope>('related')
  const [status, setStatus] = useState('all')
  const [tasks, setTasks] = useState<CanonicalTaskListItem[]>([])
  const [profileId, setProfileId] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [company, setCompany] = useState<string | null>(null)
  const [assigneeId, setAssigneeId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const result = await listTasks()
      if (!mounted) return
      setProfileId(result.viewer.profile_id)
      setTeamId(result.viewer.equipo?.id ?? null)
      setCompany(result.viewer.empresa?.codigo ?? null)
      setTasks(result.tasks)
      setLoading(false)
    }
    void load().catch((caught) => {
      if (!mounted) return
      setError(caught instanceof Error ? caught.message : 'Tasks unavailable')
      setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  const visible = useMemo(() => visibleMeetTasks(tasks, scope, { profileId, teamId, company }, assigneeId, status), [assigneeId, company, profileId, scope, status, tasks, teamId])
  const assignees = useMemo(() => Array.from(new Map(tasks.map((task) => [task.responsable_id, task.responsable])).entries()), [tasks])
  const statuses = useMemo(() => Array.from(new Set(tasks.map((task) => task.estado))).sort(), [tasks])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="heading text-2xl font-bold">{t('tasks')}</h1>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{t('readOnly')}</span>
          </div>
          <p className="muted mt-1 text-sm">{t('taskSourceNotice')}</p>
        </div>
        <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          {(['related', 'all', 'mine', 'team', 'company'] as TaskScope[]).map((value) => {
            const label = value === 'related' ? 'relatedToMe' : value === 'all' ? 'all' : value === 'mine' ? 'mine' : value === 'team' ? 'myTeam' : 'myCompany'
            return <button key={value} onClick={() => setScope(value)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${scope === value ? 'bg-brand text-white' : 'text-gray-600 dark:text-slate-300'}`}>{t(label)}</button>
          })}
        </div>
        <select value={assigneeId} onChange={(event) => { setAssigneeId(event.target.value); setScope('all') }} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
          <option value="">{t('allAssignees')}</option>
          {assignees.map(([id, assignee]) => <option key={id} value={id}>{assignee?.nombre ?? id}</option>)}
        </select>
        <select aria-label={t('status')} value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
          <option value="all">{t('allStatuses')}</option>
          {statuses.map((value) => <option key={value} value={value}>{taskStatusLabel(value, locale)}</option>)}
        </select>
      </header>

      {loading ? <p className="muted">{t('loading')}</p> : error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
      ) : visible.length === 0 ? (
        <div className="surface rounded-2xl border border-dashed p-12 text-center"><p className="muted">{t('noTasks')}</p></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((task) => (
            <article key={`${task.id}:${task.meeting?.id ?? 'crm'}`} className="surface rounded-2xl border p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h2 className="heading font-semibold">{task.titulo}</h2>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${actividadEstadoStyle(task.estado)}`}>{taskStatusLabel(task.estado, locale)}</span>
              </div>
              {task.descripcion && <p className="muted mt-2 text-sm leading-relaxed">{task.descripcion}</p>}
              <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
                <Field label={t('assignee')} value={task.responsable?.nombre} />
                <Field label={t('team')} value={task.equipo?.nombre} />
                <Field label={t('department')} value={task.departamento?.nombre} />
                <Field label={t('company')} value={task.meeting?.company ?? task.empresa} />
                <Field label={t('createdAt')} value={task.created_at ? formatDate(task.created_at) : null} />
                <Field label={t('dueDate')} value={task.fecha_entrega ? formatDate(task.fecha_entrega) : t('noDate')} />
              </dl>
              {task.meeting && <Link href={`/meetings/${task.meeting.id}`} className="mt-4 inline-flex text-sm font-medium text-brand hover:text-brand-dark">{t('originMeeting')}: {task.meeting.title}</Link>}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  const { t } = usePreferences()
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt><dd className="heading mt-0.5">{value || t('notRegistered')}</dd></div>
}
