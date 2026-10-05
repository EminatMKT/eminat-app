'use client'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { supabase } from '@/shared/db/supabase'
import { TABLES } from '@/shared/data/tables'
import ACTIVITY_SELECT from '@/shared/data/actividades/activity-select'
import flattenEmbed from '@/shared/data/actividades/flatten-embed'
import { useT } from '@/shared/i18n'
import { estadoLabel } from '@/shared/constants/domain'
import { etiquetaResponsablesCompacta, usersFromNames } from '@/features/tasks/utils/responsables'
import { useTasks } from '../../TasksContext'
import type { Actividad } from '@/features/tasks/types'
import { dateFromKey, movePeriod, period, todayKey, type CalendarMode } from '@/features/tasks/calendar/period'
import s from './index.module.css'

type Project = { id: string; name: string; company_code: string }
type Marker = Project & { start_date: string | null; target_date: string | null }
type Task = Actividad & { id: string; titulo: string; fecha_entrega: string; empresa: string; estado: string; project_id: string | null }

export default function CalendarTab({ projectId }: { projectId?: string }) {
  const { esAdmin, empresas, usuarios, miembrosPorId } = useApp()
  const { setModalVerAct } = useTasks()
  const { t, intlLocale } = useT()
  const [mode, setMode] = useState<CalendarMode>('month')
  const [cursor, setCursor] = useState(todayKey)
  const [selectedDay, setSelectedDay] = useState(todayKey)
  const [project, setProject] = useState(projectId || '')
  const [company, setCompany] = useState('')
  const [member, setMember] = useState('')
  const [status, setStatus] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [markers, setMarkers] = useState<Marker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const visible = useMemo(() => period(cursor, mode), [cursor, mode])
  const currentMonth = cursor.slice(0, 7)
  const projectById = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p.name])), [projects])
  const brandByCode = useMemo(() => Object.fromEntries(empresas.map(e => [e.codigo, e.nombre])), [empresas])
  const responsibleUsers = useMemo(() => usersFromNames(miembrosPorId), [miembrosPorId])
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    for (const task of tasks) (grouped[task.fecha_entrega] ||= []).push(task)
    return grouped
  }, [tasks])
  const markersByDay = useMemo(() => {
    const grouped: Record<string, { marker: Marker; kind: 'start' | 'target' }[]> = {}
    for (const marker of markers) {
      if (marker.start_date) (grouped[marker.start_date] ||= []).push({ marker, kind: 'start' })
      if (marker.target_date) (grouped[marker.target_date] ||= []).push({ marker, kind: 'target' })
    }
    return grouped
  }, [markers])

  useEffect(() => {
    if (projectId) { setProject(projectId); return }
    let cancelled = false
    void (async () => {
      const all: Project[] = []
      for (let offset = 0; ; offset += 500) {
        const { data, error: queryError } = await supabase.from(TABLES.projects).select('id,name,company_code').order('name').range(offset, offset + 499)
        if (queryError || cancelled) break
        all.push(...((data || []) as Project[]))
        if (!data || data.length < 500) break
      }
      if (!cancelled) setProjects(all)
    })()
    return () => { cancelled = true }
  }, [projectId])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ start: visible.first, end: visible.last })
    if (project) params.set('project', project)
    if (company) params.set('company', company)
    if (member && esAdmin) params.set('member', member)
    if (status) params.set('status', status)
    setLoading(true); setError('')
    void fetch(`/api/tasks/calendar?${params}`, { signal: controller.signal })
      .then(async response => {
        const json = await response.json()
        if (!response.ok) throw new Error(json.error || t('calendar.loadError'))
        setTasks(json.tasks || []); setMarkers(json.markers || [])
      })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message || t('calendar.loadError')) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [visible.first, visible.last, project, company, member, status, esAdmin, t])

  function move(step: number) {
    const next = movePeriod(cursor, mode, step)
    setCursor(next); setSelectedDay(next); setExpanded([])
  }
  function today() { const now = todayKey(); setCursor(now); setSelectedDay(now) }
  const dateLabel = (day: string, options: Intl.DateTimeFormatOptions) => dateFromKey(day).toLocaleDateString(intlLocale, options)
  async function openTask(task: Task) {
    const { data, error: taskError } = await supabase.from(TABLES.actividades).select(ACTIVITY_SELECT).eq('id', task.id).maybeSingle()
    if (taskError || !data) { setError(t('calendar.loadError')); return }
    setModalVerAct(flattenEmbed(data))
  }
  const taskLine = (task: Task) => <button key={task.id} className={`${s.task} ${task.estado === 'Completado' ? s.completed : ''}`} onClick={() => void openTask(task)} title={`${task.titulo} · ${estadoLabel(task.estado, t)} · ${task.fecha_entrega}`}>
    <strong>{task.titulo}</strong><span>{projectById[task.project_id || ''] || brandByCode[task.empresa] || task.empresa}</span><small>{etiquetaResponsablesCompacta(task, responsibleUsers).label} · {estadoLabel(task.estado, t)}</small>
  </button>
  const markerLines = (day: string) => (markersByDay[day] || []).map(({ marker, kind }) => <div className={s.marker} key={`${marker.id}-${kind}`}>◇ {marker.name} · {kind === 'start' ? t('calendar.projectStart') : t('calendar.projectTarget')}</div>)
  const dayTasks = (day: string) => tasksByDay[day] || []
  const title = mode === 'month' ? dateLabel(cursor, { month: 'long', year: 'numeric' }) : `${dateLabel(visible.first, { day: 'numeric', month: 'short' })} – ${dateLabel(visible.last, { day: 'numeric', month: 'short', year: 'numeric' })}`
  const hasItems = tasks.length > 0 || markers.length > 0

  return <div className={`${s.page} ${projectId ? s.embedded : ''}`}>
    {!projectId && <div className={s.heading}><div className={s.eyebrow}>{t('projects.workspace')}</div><h1>{t('calendar.title')}</h1></div>}
    <div className={s.toolbar}><div className={s.period}><button onClick={today}>{t('calendar.today')}</button><button aria-label={t('calendar.previous')} onClick={() => move(-1)}>←</button><strong>{title}</strong><button aria-label={t('calendar.next')} onClick={() => move(1)}>→</button></div><div className={s.mode}><button aria-pressed={mode === 'month'} onClick={() => setMode('month')}>{t('calendar.month')}</button><button aria-pressed={mode === 'week'} onClick={() => setMode('week')}>{t('calendar.week')}</button></div></div>
    <div className={s.filters}>
      {!projectId && <label>{t('calendar.project')}<select value={project} onChange={e => setProject(e.target.value)}><option value="">{t('calendar.allProjects')}</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
      <label>{t('calendar.brand')}<select value={company} onChange={e => setCompany(e.target.value)}><option value="">{t('calendar.allBrands')}</option>{empresas.map(e => <option key={e.codigo} value={e.codigo}>{e.nombre}</option>)}</select></label>
      {esAdmin && <label>{t('calendar.member')}<select value={member} onChange={e => setMember(e.target.value)}><option value="">{t('calendar.allMembers')}</option>{usuarios.filter(u => u.activo).map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}</select></label>}
      <label>{t('calendar.status')}<select value={status} onChange={e => setStatus(e.target.value)}><option value="">{t('calendar.allStatuses')}</option>{['Pendiente', 'En proceso', 'Por aprobar', 'Completado', 'Rechazado', 'Cancelado'].map(value => <option key={value} value={value}>{estadoLabel(value, t)}</option>)}</select></label>
    </div>
    {error && <div role="alert" className={s.error}>{error}</div>}
    {loading ? <p className={s.notice}>{t('calendar.loading')}</p> : <>
      {!hasItems && <p className={s.notice}>{project ? t('calendar.emptyProject') : t('calendar.emptyPeriod')}</p>}
      <div className={`${s.grid} ${mode === 'week' ? s.week : ''}`} role="grid" aria-label={title}>
        {visible.days.slice(0, 7).map(day => <div role="columnheader" className={s.weekday} key={`head-${day}`}>{dateLabel(day, { weekday: 'short' })}</div>)}
        {visible.days.map(day => {
          const list = dayTasks(day)
          const limit = mode === 'month' && !expanded.includes(day) ? 3 : list.length
          const outside = mode === 'month' && day.slice(0, 7) !== currentMonth
          return <div role="gridcell" className={`${s.day} ${outside ? s.outside : ''} ${day === todayKey() ? s.today : ''} ${day === selectedDay ? s.selected : ''}`} key={day}>
            <button className={s.dayHeading} onClick={() => setSelectedDay(day)} aria-label={dateLabel(day, { weekday: 'long', day: 'numeric', month: 'long' })}>{dateLabel(day, { weekday: 'short', day: 'numeric' })}</button>
            <div className={s.desktopItems}>{markerLines(day)}{list.slice(0, limit).map(taskLine)}{list.length > limit && <button className={s.more} onClick={() => setExpanded(v => [...v, day])}>+{list.length - limit} {t('calendar.more')}</button>}</div>
          </div>
        })}
      </div>
      <section className={s.agenda} aria-live="polite"><h2>{dateLabel(selectedDay, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>{markerLines(selectedDay)}{dayTasks(selectedDay).length ? dayTasks(selectedDay).map(taskLine) : <p>{t('calendar.emptyDay')}</p>}</section>
    </>}
  </div>
}
