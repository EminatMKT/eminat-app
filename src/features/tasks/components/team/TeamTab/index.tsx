'use client'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { supabase } from '@/shared/db/supabase'
import { TABLES } from '@/shared/data/tables'
import { useT } from '@/shared/i18n'
import { taskProjectScope, visiblePeopleIds, visibleWorkload, type TeamMembership, type TeamWorkload } from './model'
import s from './index.module.css'

type Project = { id: string; name: string; status: string }
type Task = { id: string; titulo: string; estado: string; project_id: string | null }

export default function TeamTab({ initialMemberId }: { initialMemberId?: string | null }) {
  const { t } = useT()
  const { esAdmin, usuario, usuarios, equipos, miembrosAsignables } = useApp()
  const [projects, setProjects] = useState<Project[]>([])
  const [memberships, setMemberships] = useState<TeamMembership[]>([])
  const [workload, setWorkload] = useState<TeamWorkload[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selected, setSelected] = useState<string | null>(initialMemberId || null)
  const [section, setSection] = useState<'overview' | 'projects' | 'tasks'>('overview')
  const [search, setSearch] = useState('')
  const [teamId, setTeamId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { if (initialMemberId) { setSelected(initialMemberId); setSection('overview') } }, [initialMemberId])
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const projectResult = await supabase.from(TABLES.projects).select('id,name,status').order('name').limit(1000)
      if (!active) return
      if (projectResult.error) { setError(projectResult.error.message); setLoading(false); return }
      const visibleProjects = (projectResult.data || []) as Project[]
      const ids = visibleProjects.map(p => p.id)
      const memberResult = ids.length
        ? await supabase.from(TABLES.projectMembers).select('project_id,user_id,project_role').in('project_id', ids)
        : { data: [], error: null }
      if (!active) return
      setProjects(visibleProjects)
      setMemberships((memberResult.data || []) as TeamMembership[])
      if (memberResult.error) setError(memberResult.error.message)
      if (esAdmin) {
        const result = await supabase.rpc('lilly_team_workload')
        if (!active) return
        if (result.error) setError(result.error.message)
        else setWorkload((result.data || []) as TeamWorkload[])
      }
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [esAdmin])

  const visibleIds = useMemo(() => visiblePeopleIds(esAdmin, miembrosAsignables.map(u => u.id), usuario?.id, memberships), [esAdmin, miembrosAsignables, memberships, usuario?.id])
  const people = useMemo(() => usuarios.filter(u => u.id && u.activo && visibleIds.has(u.id)), [usuarios, visibleIds])
  const activeProjects = useMemo(() => projects.filter(p => p.status !== 'Archived' && p.status !== 'Completed'), [projects])
  const filtered = useMemo(() => people.filter(person => {
    const name = `${person.nombre || ''} ${person.apellido || ''}`.toLocaleLowerCase()
    return (!search || name.includes(search.toLocaleLowerCase()))
      && (!teamId || person.equipo_id === teamId)
      && (!projectId || memberships.some(m => m.project_id === projectId && m.user_id === person.id))
  }), [people, search, teamId, projectId, memberships])
  const current = people.find(p => p.id === selected)
  const currentMemberships = memberships.filter(m => m.user_id === selected)
  const projectById = (id: string) => projects.find(p => p.id === id)
  const activeCount = (id: string) => memberships.filter(m => m.user_id === id && activeProjects.some(p => p.id === m.project_id)).length
  const loadFor = selected ? visibleWorkload(esAdmin, selected, workload) : null

  useEffect(() => {
    let active = true
    async function loadTasks() {
      if (!selected || !visibleIds.has(selected)) { setTasks([]); return }
      // Workers only request their own tasks or assignments inside projects RLS made visible.
      let query = supabase.from(TABLES.actividades).select('id,titulo,estado,project_id,actividad_responsables!actividad_responsables_actividad_id_fkey!inner(usuario_id)').eq('actividad_responsables.usuario_id', selected).order('created_at', { ascending: false }).limit(100)
      const scope = taskProjectScope(esAdmin, usuario?.id, selected, memberships)
      if (scope) {
        if (!scope.length) { setTasks([]); return }
        query = query.in('project_id', scope)
      }
      const result = await query
      if (!active) return
      if (result.error) setError(result.error.message)
      else setTasks((result.data || []) as Task[])
    }
    void loadTasks()
    return () => { active = false }
  }, [esAdmin, memberships, selected, usuario?.id, visibleIds])

  const teamName = (id?: string | null) => equipos.find(e => e.id === id)?.nombre || t('team.unassigned')
  const nameOf = (person: typeof people[number]) => `${person.nombre || ''} ${person.apellido || ''}`.trim()
  const roleOf = (person: typeof people[number]) => person.usuario_cargos?.map(c => c.cargos?.nombre).filter(Boolean).join(' · ') || ''

  return <div className={s.page}>
    <div className={s.heading}><div><div className={s.eyebrow}>{t('projects.workspace')} / {t('team.title')}</div><h1>{t('team.title')}</h1><p>{t('team.subtitle')}</p></div></div>
    {error && <p className={s.error} role="alert">{error}</p>}
    {current ? <section className={s.detail}>
      <button className={s.back} onClick={() => setSelected(null)}>{t('team.back')}</button>
      <div className={s.personHead}><div className={s.avatar}>{(current.nombre || '?')[0]}{(current.apellido || '')[0]}</div><div><div className={s.eyebrow}>{teamName(current.equipo_id)}</div><h2>{nameOf(current)}</h2>{roleOf(current) && <p>{roleOf(current)}</p>}</div></div>
      <nav className={s.nav} aria-label={t('team.sections')}><button className={section === 'overview' ? s.active : ''} onClick={() => setSection('overview')}>{t('projects.overview')}</button><button className={section === 'projects' ? s.active : ''} onClick={() => setSection('projects')}>{t('projects.title')}</button><button className={section === 'tasks' ? s.active : ''} onClick={() => setSection('tasks')}>{t('projects.tasks')}</button></nav>
      {section === 'overview' && <div className={s.overview}><div><span>{t('team.orgTeam')}</span><strong>{teamName(current.equipo_id)}</strong></div><div><span>{t('team.activeProjects')}</span><strong>{activeCount(current.id)}</strong></div>{esAdmin && <><div><span>{t('team.pending')}</span><strong>{loadFor?.pending_count || 0}</strong></div><div><span>{t('team.inProgress')}</span><strong>{loadFor?.in_progress_count || 0}</strong></div></>}</div>}
      {section === 'projects' && <div className={s.rows}>{currentMemberships.length ? currentMemberships.map(m => <div className={s.listRow} key={m.project_id}><strong>{projectById(m.project_id)?.name || t('team.project')}</strong><span>{t(`team.role.${m.project_role}` as 'team.role.Member')}</span></div>) : <p>{t('team.noProjects')}</p>}</div>}
      {section === 'tasks' && <div className={s.rows}>{tasks.length ? tasks.map(task => <div className={s.listRow} key={task.id}><strong>{task.titulo}</strong><span>{task.estado}{task.project_id && projectById(task.project_id) ? ` · ${projectById(task.project_id)?.name}` : ''}</span></div>) : <p>{t('team.noTasks')}</p>}</div>}
    </section> : <>
      <div className={s.filters}><input aria-label={t('team.search')} placeholder={t('team.search')} value={search} onChange={e => setSearch(e.target.value)} /><select aria-label={t('team.orgTeam')} value={teamId} onChange={e => setTeamId(e.target.value)}><option value="">{t('team.allTeams')}</option>{equipos.filter(e => e.activo !== false).map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select><select aria-label={t('team.project')} value={projectId} onChange={e => setProjectId(e.target.value)}><option value="">{t('team.allProjects')}</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      {loading ? <p>{t('team.loading')}</p> : filtered.length ? <div className={s.grid}>{filtered.map(person => { const assigned = memberships.filter(m => m.user_id === person.id).map(m => projectById(m.project_id)?.name).filter(Boolean); const work = visibleWorkload(esAdmin, person.id, workload); return <button key={person.id} className={s.card} onClick={() => { setSelected(person.id); setSection('overview') }}><div className={s.cardTop}><span className={s.avatar}>{(person.nombre || '?')[0]}{(person.apellido || '')[0]}</span><span><strong>{nameOf(person)}</strong><small>{teamName(person.equipo_id)}{roleOf(person) ? ` · ${roleOf(person)}` : ''}</small></span></div><div className={s.cardMeta}>{t('team.projectCount', { count: activeCount(person.id) })}{work && <span> · {t('team.workloadShort', { pending: work.pending_count, progress: work.in_progress_count })}</span>}</div><div className={s.projectNames}>{assigned.slice(0, 3).join(' · ') || t('team.noProjects')}</div></button> })}</div> : <div className={s.empty}>{t('team.empty')}</div>}
    </>}
  </div>
}
