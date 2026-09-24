import type { SupabaseClient } from '@supabase/supabase-js'
import { COLUMNAS_KANBAN } from '@/shared/constants/domain'
import type { CanonicalMeetTask, CanonicalMeetTaskList, CanonicalMeetTaskListItem, CreateMeetTaskInput, UpdateMeetTaskInput } from './contracts'

const taskProjection = 'id, titulo, descripcion, responsable_id, estado, fecha_inicio, fecha_entrega, fecha_requerida, empresa, updated_at, usuarios!actividades_responsable_id_fkey(id, nombre_display, nombre, apellido, equipos!usuarios_equipo_id_fkey(id, codigo, nombre, activo, departamentos(id, codigo, nombre)))'
type Failure = { ok: false; status: number; code: string; message: string; current?: CanonicalMeetTask; data?: never }
type Success<T> = { ok: true; data: T; status?: never; code?: never; message?: never; current?: never }
export type ServiceResult<T> = { ok: boolean; data?: T; status?: number; code?: string; message?: string; current?: CanonicalMeetTask }

type DepartmentRow = { id: string; codigo: string; nombre: string }
type TeamRow = { id: string; codigo: string; nombre: string; activo?: boolean; departamentos?: DepartmentRow | DepartmentRow[] | null }
type UserRow = { id: string; nombre_display?: string | null; nombre?: string | null; apellido?: string | null; rol?: string | null; equipos?: TeamRow | TeamRow[] | null }
type ActivityRow = { id: string; titulo: string; descripcion?: string | null; responsable_id: string; estado: string; fecha_inicio: string; fecha_entrega?: string | null; fecha_requerida?: string | null; empresa: string; updated_at: string; usuarios?: UserRow | UserRow[] | null }
type TopicRow = { id: string; actividad_id?: string | null; meetings?: { user_id: string } | { user_id: string }[] | null }
type ListTopicRow = { actividad_id?: string | null; meetings?: { id: string; title: string; user_id: string; empresas?: { nombre: string } | { nombre: string }[] | null } | { id: string; title: string; user_id: string; empresas?: { nombre: string } | { nombre: string }[] | null }[] | null }
type DirectoryUserRow = { id: string; equipo_id?: string | null; empresa_id?: string | null; equipos?: { id: string; nombre: string } | { id: string; nombre: string }[] | null; empresas?: { id: string; codigo: string; nombre: string } | { id: string; codigo: string; nombre: string }[] | null }

const first = <T>(value: T | T[] | null | undefined): T | null => Array.isArray(value) ? value[0] ?? null : value ?? null

function canonical(row: ActivityRow): CanonicalMeetTask {
  const user = first(row.usuarios)
  const team = first(user?.equipos)
  const department = first(team?.departamentos)
  return {
    id: row.id, titulo: row.titulo, descripcion: row.descripcion ?? null,
    responsable_id: row.responsable_id, estado: row.estado, fecha_inicio: row.fecha_inicio,
    // fecha_requerida sólo es compatibilidad de lectura para filas históricas.
    fecha_entrega: row.fecha_entrega ?? row.fecha_requerida ?? null, empresa: row.empresa, updated_at: row.updated_at,
    responsable: user ? { id: user.id, nombre: user.nombre_display || `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || user.id } : null,
    equipo: team ? { id: team.id, codigo: team.codigo, nombre: team.nombre } : null,
    departamento: department ? { id: department.id, codigo: department.codigo, nombre: department.nombre } : null,
  }
}

async function canManageActivity(client: SupabaseClient, activityId: string, authUserId: string) {
  const { data: topic, error } = await client
    .from('topics')
    .select('id, meetings!inner(user_id)')
    .eq('actividad_id', activityId)
    .limit(1)
    .maybeSingle()
  const row = topic as unknown as TopicRow | null
  return !error && Boolean(row) && first(row?.meetings)?.user_id === authUserId
}

export async function getCanonicalTask(client: SupabaseClient, activityId: string, authUserId?: string): Promise<ServiceResult<CanonicalMeetTask>> {
  if (authUserId && !(await canManageActivity(client, activityId, authUserId))) {
    return { ok: false, status: 403, code: 'TASK_FORBIDDEN', message: 'No puede consultar esta Task desde Meet.' }
  }
  const { data, error } = await client.from('actividades').select(taskProjection).eq('id', activityId).maybeSingle()
  if (error) return { ok: false, status: 403, code: 'TASK_READ_FORBIDDEN', message: error.message }
  if (!data) return { ok: false, status: 404, code: 'TASK_NOT_FOUND', message: 'Task no encontrada.' }
  return { ok: true, data: canonical(data as unknown as ActivityRow) }
}

export async function listCanonicalTasks(client: SupabaseClient, authUserId: string, profileId: string): Promise<ServiceResult<CanonicalMeetTaskList>> {
  const [profileResult, directoryResult, activitiesResult, topicsResult] = await Promise.all([
    client.from('usuarios').select('id, equipo_id, empresa_id, equipos!usuarios_equipo_id_fkey(id, nombre), empresas(id, codigo, nombre)').eq('id', profileId).maybeSingle(),
    client.from('usuarios').select('id, equipo_id, empresa_id').eq('activo', true),
    client.from('actividades').select(taskProjection),
    client.from('topics').select('actividad_id, meetings(id, title, user_id, empresas(nombre))').not('actividad_id', 'is', null),
  ])
  const error = profileResult.error || directoryResult.error || activitiesResult.error
  if (error || !profileResult.data) return { ok: false, status: 403, code: 'TASK_LIST_FORBIDDEN', message: error?.message ?? 'No se pudo determinar el alcance de Tasks.' }

  const profile = profileResult.data as DirectoryUserRow
  const authorizedAssignees = new Set(
    ((directoryResult.data ?? []) as DirectoryUserRow[])
      .filter((user) => user.id === profileId ||
        Boolean(profile.equipo_id && user.equipo_id === profile.equipo_id) ||
        Boolean(profile.empresa_id && user.empresa_id === profile.empresa_id))
      .map((user) => user.id),
  )
  const origins = new Map<string, CanonicalMeetTaskListItem['meeting']>()
  const ownedActivities = new Set<string>()
  if (!topicsResult.error) {
    for (const row of (topicsResult.data ?? []) as unknown as ListTopicRow[]) {
      if (!row.actividad_id) continue
      const meeting = first(row.meetings)
      if (!meeting) continue
      const company = first(meeting.empresas)
      origins.set(row.actividad_id, { id: meeting.id, title: meeting.title, company: company?.nombre ?? null })
      if (meeting.user_id === authUserId) ownedActivities.add(row.actividad_id)
    }
  }
  const tasks = ((activitiesResult.data ?? []) as unknown as ActivityRow[])
    .filter((row) => authorizedAssignees.has(row.responsable_id) || ownedActivities.has(row.id))
    .map((row) => ({ ...canonical(row), meeting: origins.get(row.id) ?? null }))
  return { ok: true, data: {
    tasks,
    viewer: { profile_id: profileId, equipo: first(profile.equipos), empresa: first(profile.empresas) },
  } }
}

async function validateAssignee(client: SupabaseClient, id: string): Promise<Failure | null> {
  const { data: user, error } = await client.from('usuarios').select('id, rol, activo').eq('id', id).maybeSingle()
  if (error || !user?.activo) return { ok: false, status: 422, code: 'INVALID_ASSIGNEE', message: 'El responsable no está activo o no existe.' }
  const { data: modules, error: modulesError } = await client.from('role_modules').select('role_key').eq('role_key', user.rol).eq('module_slug', 'tasks')
  if (modulesError || (!modules?.length && user.rol !== 'admin')) return { ok: false, status: 422, code: 'INVALID_ASSIGNEE', message: 'El responsable no tiene el módulo tasks.' }
  return null
}

async function validateCompany(client: SupabaseClient, code: string): Promise<Failure | null> {
  const { data, error } = await client.from('empresas').select('codigo').eq('codigo', code).eq('activo', true).eq('recibe_actividades', true).maybeSingle()
  return error || !data ? { ok: false, status: 422, code: 'INVALID_COMPANY', message: 'La empresa no está habilitada para Activities.' } : null
}

async function manageableTopic(client: SupabaseClient, topicId: string, authUserId: string) {
  const { data, error } = await client.from('topics').select('id, actividad_id, meetings!inner(user_id)').eq('id', topicId).maybeSingle()
  const topic = data as unknown as TopicRow | null
  const meeting = first(topic?.meetings)
  return { allowed: !error && Boolean(topic) && meeting?.user_id === authUserId, topic }
}

export async function createTaskForTopic(client: SupabaseClient, authUserId: string, input: CreateMeetTaskInput): Promise<ServiceResult<{ task: CanonicalMeetTask; idempotent: boolean }>> {
  const access = await manageableTopic(client, input.topic_id, authUserId)
  if (!access.allowed) return { ok: false, status: 403, code: 'TOPIC_FORBIDDEN', message: 'No puede administrar este Topic.' }
  if (access.topic?.actividad_id) {
    const existing = await getCanonicalTask(client, access.topic.actividad_id)
    return existing.ok ? { ok: true, data: { task: existing.data!, idempotent: true } } : { ok: false, status: existing.status!, code: existing.code!, message: existing.message! }
  }
  const invalidAssignee = await validateAssignee(client, input.responsable_id)
  if (invalidAssignee) return invalidAssignee
  const invalidCompany = await validateCompany(client, input.empresa)
  if (invalidCompany) return invalidCompany
  const { data: activityId, error } = await client.rpc('create_meet_activity_for_topic', {
    p_topic_id: input.topic_id, p_titulo: input.titulo, p_descripcion: input.descripcion ?? null,
    p_responsable_id: input.responsable_id, p_fecha_inicio: input.fecha_inicio,
    p_fecha_entrega: input.fecha_entrega ?? null, p_empresa: input.empresa,
  })
  if (error || !activityId) return { ok: false, status: 409, code: 'TASK_CREATE_FAILED', message: error?.message ?? 'No se pudo crear la Task.' }
  const task = await getCanonicalTask(client, activityId as string)
  return task.ok ? { ok: true, data: { task: task.data!, idempotent: false } } : { ok: false, status: task.status!, code: task.code!, message: task.message! }
}

export async function updateTask(client: SupabaseClient, authUserId: string, activityId: string, input: UpdateMeetTaskInput): Promise<ServiceResult<CanonicalMeetTask>> {
  if (!(await canManageActivity(client, activityId, authUserId))) return { ok: false, status: 403, code: 'TASK_FORBIDDEN', message: 'No puede administrar esta Task desde Meet.' }
  if (input.responsable_id) {
    const invalidAssignee = await validateAssignee(client, input.responsable_id)
    if (invalidAssignee) return invalidAssignee
  }
  if (input.empresa) {
    const invalidCompany = await validateCompany(client, input.empresa)
    if (invalidCompany) return invalidCompany
  }
  const { expected_updated_at, ...changes } = input
  const { data, error } = await client.from('actividades').update(changes).eq('id', activityId).eq('updated_at', expected_updated_at).select(taskProjection).maybeSingle()
  if (error) return { ok: false, status: 403, code: 'TASK_UPDATE_FORBIDDEN', message: error.message }
  if (!data) {
    const current = await getCanonicalTask(client, activityId)
    return { ok: false, status: 409, code: 'TASK_CONFLICT', message: 'La Task fue modificada desde otra sesión.', ...(current.ok ? { current: current.data } : {}) }
  }
  return { ok: true, data: canonical(data as unknown as ActivityRow) }
}

export async function getTaskCatalogs(client: SupabaseClient): Promise<ServiceResult<unknown>> {
  const [companies, departments, teams] = await Promise.all([
    client.from('empresas').select('id, codigo, nombre').eq('activo', true).eq('recibe_actividades', true).order('nombre'),
    client.from('departamentos').select('id, codigo, nombre').order('nombre'),
    client.from('equipos').select('id, codigo, nombre, departamento_id, activo').eq('activo', true).order('nombre'),
  ])
  const error = companies.error || departments.error || teams.error
  if (error) return { ok: false, status: 403, code: 'CATALOGS_FORBIDDEN', message: error.message }
  return { ok: true, data: { states: [...COLUMNAS_KANBAN], companies: companies.data ?? [], departments: departments.data ?? [], teams: teams.data ?? [] } }
}

export async function getTaskAssignees(client: SupabaseClient): Promise<ServiceResult<unknown>> {
  const [users, modules] = await Promise.all([
    client.from('usuarios').select('id, nombre_display, nombre, apellido, rol, equipo_id, equipos!usuarios_equipo_id_fkey(id, codigo, nombre, activo, departamentos(id, codigo, nombre))').eq('activo', true),
    client.from('role_modules').select('role_key').eq('module_slug', 'tasks'),
  ])
  const error = users.error || modules.error
  if (error) return { ok: false, status: 403, code: 'ASSIGNEES_FORBIDDEN', message: error.message }
  const roles = new Set((modules.data ?? []).map((row: { role_key: string }) => row.role_key))
  const assignees = ((users.data ?? []) as unknown as UserRow[]).filter((user) => user.rol === 'admin' || roles.has(user.rol ?? '')).map((user) => {
    const team = first(user.equipos)
    const department = first(team?.departamentos)
    return {
      id: user.id, nombre: user.nombre_display || `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || user.id,
      equipo: team?.activo !== false && team ? { id: team.id, codigo: team.codigo, nombre: team.nombre } : null,
      departamento: department ? { id: department.id, codigo: department.codigo, nombre: department.nombre } : null,
    }
  })
  return { ok: true, data: { assignees } }
}
