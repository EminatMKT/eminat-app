'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { supabase } from '@/shared/db/supabase'
import { TABLES } from '@/shared/data/tables'
import { useT, type I18nKey } from '@/shared/i18n'
import s from './index.module.css'
import CalendarTab from '../../calendar/CalendarTab'

const STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Archived'] as const
type Status = typeof STATUSES[number]
const STATUS_KEYS: Record<Status, I18nKey> = { Planning: 'projects.status.Planning', Active: 'projects.status.Active', 'On Hold': 'projects.status.On Hold', Completed: 'projects.status.Completed', Archived: 'projects.status.Archived' }
type Project = { id: string; name: string; description: string; company_code: string; status: Status; start_date: string | null; target_date: string | null; created_by: string }
type Member = { project_id: string; user_id: string; project_role: string; usuarios: { nombre_display: string } | null }
type Task = { id: string; project_id: string; titulo: string; estado: string }
type Stats = { project_id: string; task_count: number; completed_count: number }
type Draft = { name: string; description: string; company_code: string; status: Status; start_date: string; target_date: string; member_ids: string[] }
const emptyDraft = (): Draft => ({ name: '', description: '', company_code: '', status: 'Planning', start_date: '', target_date: '', member_ids: [] })
const dateText = (value: string | null, locale: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const PROJECT_ROLES = ['Project Lead', 'Member', 'Reviewer'] as const
type ProjectRole = typeof PROJECT_ROLES[number]

export default function ProjectsTab({ onOpenMember }: { onOpenMember?: (userId: string) => void }) {
  const { esAdmin, usuario, empresas, usuarios, actividades } = useApp()
  const { t, intlLocale } = useT()
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<Stats[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Current')
  const [company, setCompany] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<'Overview' | 'Tasks' | 'Team' | 'Calendar'>('Overview')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(100)
  const [hasMore, setHasMore] = useState(false)
  const [taskToLink, setTaskToLink] = useState('')
  const [memberToAdd, setMemberToAdd] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase.from(TABLES.projects).select('id,name,description,company_code,status,start_date,target_date,created_by')
      .order('created_at', { ascending: false }).range(0, limit)
    if (status === 'Current') query = query.neq('status', 'Archived')
    else if (status !== 'All') query = query.eq('status', status)
    if (company) query = query.eq('company_code', company)
    if (search.trim()) query = query.ilike('name', `%${search.trim().replace(/[%_,]/g, '')}%`)
    const { data, error } = await query
    if (error) { setMessage(error.message); setLoading(false); return }
    const rows = (data ?? []) as Project[]
    setProjects(rows.slice(0, limit))
    setHasMore(rows.length > limit)
    const ids = rows.slice(0, limit).map(p => p.id)
    if (!ids.length) { setMembers([]); setStats([]); setLoading(false); return }
    const [memberResult, statsResult] = await Promise.all([
      supabase.from(TABLES.projectMembers).select('project_id,user_id,project_role,usuarios(nombre_display)').in('project_id', ids),
      supabase.from(TABLES.projectTaskStats).select('project_id,task_count,completed_count').in('project_id', ids),
    ])
    if (memberResult.error || statsResult.error) setMessage(memberResult.error?.message || statsResult.error?.message || '')
    setMembers((memberResult.data ?? []) as unknown as Member[])
    setStats((statsResult.data ?? []) as Stats[])
    setLoading(false)
  }, [company, limit, search, status])

  useEffect(() => { void load() }, [load])
  const loadTasks = useCallback(async (projectId: string) => {
    const { data, error } = await supabase.from(TABLES.actividades).select('id,project_id,titulo,estado').eq('project_id', projectId).order('created_at', { ascending: false })
    if (error) setMessage(error.message)
    else setTasks((data ?? []) as Task[])
  }, [])
  useEffect(() => { if (selected && detailTab === 'Tasks') void loadTasks(selected); else setTasks([]) }, [selected, detailTab, loadTasks])

  const current = useMemo(() => projects.find(p => p.id === selected), [projects, selected])
  const projectMembers = useMemo(() => members.filter(m => m.project_id === selected), [members, selected])
  const projectTasks = useMemo(() => tasks.filter(t => t.project_id === selected), [tasks, selected])
  const companyNames = useMemo(() => Object.fromEntries(empresas.map(e => [e.codigo, e.nombre])), [empresas])
  const memberNames = (id: string) => members.filter(m => m.project_id === id).map(m => m.usuarios?.nombre_display || usuarios.find(u => u.id === m.user_id)?.nombre || 'Member')
  const taskCount = (id: string) => { const row = stats.find(t => t.project_id === id); return { all: Number(row?.task_count || 0), done: Number(row?.completed_count || 0) } }

  function startCreate() { setDraft(emptyDraft()); setEditing(true); setSelected(null); setMessage('') }
  function startEdit(p: Project) {
    setDraft({ name: p.name, description: p.description, company_code: p.company_code, status: p.status, start_date: p.start_date || '', target_date: p.target_date || '', member_ids: members.filter(m => m.project_id === p.id).map(m => m.user_id) })
    setSelected(p.id); setEditing(true); setMessage('')
  }

  async function save() {
    if (!esAdmin || !usuario?.id) return
    if (!draft.name.trim() || !draft.company_code) { setMessage(t('projects.required')); return }
    if (draft.start_date && draft.target_date && draft.target_date < draft.start_date) { setMessage(t('projects.dateError')); return }
    setBusy(true); setMessage('')
    const payload = { name: draft.name.trim(), description: draft.description.trim(), company_code: draft.company_code, status: draft.status, start_date: draft.start_date || null, target_date: draft.target_date || null }
    const result = current
      ? await supabase.from(TABLES.projects).update(payload).eq('id', current.id).select('id').single()
      : await supabase.from(TABLES.projects).insert({ ...payload, created_by: usuario.id }).select('id').single()
    if (result.error || !result.data) { setMessage(result.error?.message || t('projects.saveError')); setBusy(false); return }
    const id = result.data.id
    const before = members.filter(m => m.project_id === id).map(m => m.user_id)
    const add = draft.member_ids.filter(userId => !before.includes(userId))
    const remove = before.filter(userId => !draft.member_ids.includes(userId))
    if (add.length) {
      const added = await supabase.from(TABLES.projectMembers).insert(add.map(user_id => ({ project_id: id, user_id })))
      if (added.error) setMessage(t('projects.memberAddError', { error: added.error.message }))
    }
    if (remove.length) {
      const removed = await supabase.from(TABLES.projectMembers).delete().eq('project_id', id).in('user_id', remove)
      if (removed.error) setMessage(t('projects.memberRemoveError', { error: removed.error.message }))
    }
    setBusy(false); setEditing(false); setSelected(id); await load()
  }

  async function archive(p: Project) {
    if (!esAdmin || !window.confirm(t('projects.archiveConfirm', { name: p.name }))) return
    setBusy(true)
    const { error } = await supabase.from(TABLES.projects).update({ status: 'Archived' }).eq('id', p.id)
    if (error) setMessage(error.message)
    else { setSelected(null); await load() }
    setBusy(false)
  }

  async function linkTask() {
    if (!esAdmin || !current || !taskToLink) return
    setBusy(true); setMessage('')
    const { error } = await supabase.from(TABLES.actividades).update({ project_id: current.id }).eq('id', taskToLink)
    if (error) setMessage(error.message)
    else { setTaskToLink(''); await Promise.all([load(), loadTasks(current.id)]) }
    setBusy(false)
  }

  async function addMember() {
    if (!esAdmin || !current || !memberToAdd) return
    setBusy(true); setMessage('')
    const { error } = await supabase.from(TABLES.projectMembers).insert({ project_id: current.id, user_id: memberToAdd, project_role: 'Member' })
    if (error) setMessage(error.message)
    else { setMemberToAdd(''); await load() }
    setBusy(false)
  }

  async function removeMember(userId: string) {
    if (!esAdmin || !current) return
    setBusy(true); setMessage('')
    const { error } = await supabase.from(TABLES.projectMembers).delete().eq('project_id', current.id).eq('user_id', userId)
    if (error) setMessage(error.message)
    else await load()
    setBusy(false)
  }

  async function updateRole(userId: string, role: ProjectRole) {
    if (!esAdmin || !current) return
    setBusy(true); setMessage('')
    const { error } = await supabase.from(TABLES.projectMembers).update({ project_role: role }).eq('project_id', current.id).eq('user_id', userId)
    if (error) setMessage(error.message)
    else await load()
    setBusy(false)
  }

  const availableTasks = current && esAdmin ? actividades.filter(a => a.id && a.empresa === current.company_code && !a.project_id && !projectTasks.some(task => task.id === a.id)) : []
  const statusLabel = (value: Status) => t(STATUS_KEYS[value])
  const formatDate = (value: string | null) => dateText(value, intlLocale)

  return <div className={s.page}>
    <div className={s.heading}><div><div className={s.eyebrow}>{t('projects.workspace')} / {t('projects.title')}</div><h1>{t('projects.title')}</h1><p>{t('projects.subtitle')}</p></div>{esAdmin && <button className={s.primary} onClick={startCreate}>{t('projects.new')}</button>}</div>
    {message && <div className={s.error} role="alert">{message}</div>}
    {editing ? <section className={s.form}><div className={s.row}><h2>{current ? t('projects.edit') : t('projects.new')}</h2><button onClick={() => setEditing(false)}>{t('projects.close')}</button></div>
      <div className={s.fields}>
        <label>{t('projects.name')}<input maxLength={160} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} required /></label>
        <label>{t('projects.company')}<select value={draft.company_code} onChange={e => setDraft({ ...draft, company_code: e.target.value })}><option value="">{t('projects.selectCompany')}</option>{empresas.map(e => <option key={e.codigo} value={e.codigo}>{e.nombre}</option>)}</select></label>
        <label className={s.wide}>{t('projects.description')}<textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} rows={3} /></label>
        <label>{t('projects.status')}<select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as Status })}>{STATUSES.map(v => <option key={v} value={v}>{statusLabel(v)}</option>)}</select></label>
        <label>{t('projects.start')}<input type="date" value={draft.start_date} onChange={e => setDraft({ ...draft, start_date: e.target.value })} /></label>
        <label>{t('projects.target')}<input type="date" value={draft.target_date} onChange={e => setDraft({ ...draft, target_date: e.target.value })} /></label>
      </div>
      <div className={s.members}><strong>{t('projects.membersAccess')}</strong><div className={s.memberChoices}>{usuarios.filter(u => u.activo).map(u => <label key={u.id}><input type="checkbox" checked={draft.member_ids.includes(u.id)} onChange={e => setDraft({ ...draft, member_ids: e.target.checked ? [...draft.member_ids, u.id] : draft.member_ids.filter(id => id !== u.id) })} /> {u.nombre} {u.apellido}</label>)}</div></div>
      <div className={s.actions}><button className={s.primary} disabled={busy} onClick={() => void save()}>{busy ? t('projects.saving') : t('projects.save')}</button><button onClick={() => setEditing(false)}>{t('projects.cancel')}</button></div>
    </section> : current ? <section className={s.detail}>
      <button className={s.back} onClick={() => setSelected(null)}>{t('projects.back')}</button>
      <div className={s.row}><div><div className={s.eyebrow}>{companyNames[current.company_code] || current.company_code}</div><h2>{current.name}</h2></div><div className={s.actions}>{esAdmin && <><button onClick={() => startEdit(current)}>{t('projects.edit')}</button><button disabled={busy} onClick={() => void archive(current)}>{t('projects.archive')}</button></>}</div></div>
      <p>{current.description || t('projects.noDescription')}</p><div className={s.meta}><span className={s.badge}>{statusLabel(current.status)}</span><span>{formatDate(current.start_date)} → {formatDate(current.target_date)}</span><span>{t('projects.members', { count: projectMembers.length })}</span></div>
      <div className={s.progress}><div className={s.row}><strong>{t('projects.progress')}</strong><span>{t('projects.taskCount', { done: taskCount(current.id).done, all: taskCount(current.id).all })}</span></div><div className={s.track}><div style={{ width: `${taskCount(current.id).all ? Math.round(taskCount(current.id).done / taskCount(current.id).all * 100) : 0}%` }} /></div></div>
      <nav className={s.detailNav} aria-label={t('projects.sections')}><button className={detailTab === 'Overview' ? s.active : ''} onClick={() => setDetailTab('Overview')}>{t('projects.overview')}</button><button className={detailTab === 'Tasks' ? s.active : ''} onClick={() => setDetailTab('Tasks')}>{t('projects.tasks')}</button><button className={detailTab === 'Team' ? s.active : ''} onClick={() => setDetailTab('Team')}>{t('projects.team')}</button><button className={detailTab === 'Calendar' ? s.active : ''} onClick={() => setDetailTab('Calendar')}>{t('projects.calendar')}</button></nav>
      {detailTab === 'Overview' ? <div className={s.detailGrid}><div><h3>{t('projects.about')}</h3><p>{current.description || t('projects.noDescription')}</p><h3>{t('projects.delivery')}</h3><p>{formatDate(current.start_date)} → {formatDate(current.target_date)}</p></div><div><h3>{t('projects.membersAccess')}</h3><p>{memberNames(current.id).join(' · ') || t('projects.noMembers')}</p></div></div> : detailTab === 'Tasks' ? <div><h3>{t('projects.projectTasks')}</h3>{projectTasks.length ? <ul className={s.taskList}>{projectTasks.map(task => <li key={task.id}><span>{task.titulo}</span><small>{task.estado}</small></li>)}</ul> : <p>{t('projects.noTasks')}</p>}{esAdmin && <div className={s.actions}><select aria-label={t('projects.linkTask')} value={taskToLink} onChange={e => setTaskToLink(e.target.value)}><option value="">{t('projects.linkSelect')}</option>{availableTasks.map(a => <option key={a.id} value={a.id}>{a.titulo}</option>)}</select><button disabled={!taskToLink || busy} onClick={() => void linkTask()}>{t('projects.linkTask')}</button></div>}</div> : detailTab === 'Calendar' ? <CalendarTab projectId={current.id} /> : <div className={s.projectTeam}><h3>{t('projects.membersAccess')}</h3>{projectMembers.length ? <div className={s.teamRows}>{projectMembers.map(member => <div className={s.teamRow} key={member.user_id}><button className={s.memberLink} onClick={() => onOpenMember?.(member.user_id)}>{member.usuarios?.nombre_display || usuarios.find(u => u.id === member.user_id)?.nombre || t('team.member')}</button>{esAdmin ? <><select aria-label={t('team.projectRole')} value={member.project_role} disabled={busy} onChange={e => void updateRole(member.user_id, e.target.value as ProjectRole)}>{PROJECT_ROLES.map(role => <option key={role} value={role}>{t(`team.role.${role}` as 'team.role.Member')}</option>)}</select><button disabled={busy} onClick={() => void removeMember(member.user_id)}>{t('team.remove')}</button></> : <span>{t(`team.role.${member.project_role}` as 'team.role.Member')}</span>}</div>)}</div> : <p>{t('projects.noMembers')}</p>}{esAdmin && <div className={s.actions}><select aria-label={t('team.addMember')} value={memberToAdd} onChange={e => setMemberToAdd(e.target.value)}><option value="">{t('team.selectMember')}</option>{usuarios.filter(u => u.activo && !projectMembers.some(m => m.user_id === u.id)).map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}</select><button disabled={!memberToAdd || busy} onClick={() => void addMember()}>{t('team.addMember')}</button></div>}</div>}
    </section> : <>
      <div className={s.filters}><input aria-label={t('projects.search')} placeholder={t('projects.search')} value={search} onChange={e => { setLimit(100); setSearch(e.target.value) }} /><select aria-label={t('projects.status')} value={status} onChange={e => { setLimit(100); setStatus(e.target.value) }}><option value="Current">{t('projects.current')}</option><option value="All">{t('projects.all')}</option>{STATUSES.map(v => <option key={v} value={v}>{statusLabel(v)}</option>)}</select><select aria-label={t('projects.company')} value={company} onChange={e => { setLimit(100); setCompany(e.target.value) }}><option value="">{t('projects.allBrands')}</option>{empresas.map(e => <option key={e.codigo} value={e.codigo}>{e.nombre}</option>)}</select></div>
      {loading ? <p>{t('projects.loading')}</p> : projects.length ? <><div className={s.grid}>{projects.map(p => { const count = taskCount(p.id); return <button className={s.card} key={p.id} onClick={() => { setDetailTab('Overview'); setSelected(p.id) }}><div className={s.row}><strong>{p.name}</strong><span className={s.badge}>{statusLabel(p.status)}</span></div><div className={s.brand}>{companyNames[p.company_code] || p.company_code}</div><div className={s.cardProgress}><span>{t('projects.taskCount', { done: count.done, all: count.all })}</span><span>{count.all ? Math.round(count.done / count.all * 100) : 0}%</span></div><div className={s.track}><div style={{ width: `${count.all ? Math.round(count.done / count.all * 100) : 0}%` }} /></div><div className={s.cardFooter}><span>{memberNames(p.id).slice(0, 3).join(' · ') || t('projects.noMembers')}</span><span>{formatDate(p.target_date)}</span></div></button> })}</div>{hasMore && <button className={s.more} onClick={() => setLimit(v => v + 100)}>{t('projects.loadMore')}</button>}</> : <div className={s.empty}>{t('projects.empty')}</div>}
    </>}
  </div>
}
