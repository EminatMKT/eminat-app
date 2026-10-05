import type { SupabaseClient } from '@supabase/supabase-js'
import { ADMIN_ROLE, MODULE } from '@/shared/auth/permissions'
import { COLUMNAS_KANBAN } from '@/shared/constants/domain'
import { RPCS, TABLES, TABLE_COLUMNS } from '@/shared/schema'
import type { CanonicalMeetTask, CanonicalMeetTaskList, CanonicalMeetTaskListItem, CreateMeetTaskInput, UpdateMeetTaskInput } from './contracts'
import MEET_ERRORS from './errors'
import type { MeetError } from './errors/types'
import MEET_PROJECTIONS from './projections'
import canonicalResponsibles from './responsibles'
import normalizeResponsibles from './responsibles/normalize'
import type { MeetDepartmentRow, MeetResponsibleRow, MeetUserRow as UserRow } from './responsibles/types'

type Failure = { ok: false; status: number; code: string; message: string; current?: CanonicalMeetTask; data?: never }
export type ServiceResult<T> = { ok: boolean; data?: T; status?: number; code?: string; message?: string; current?: CanonicalMeetTask }

type ActivityRow = {
  id: string
  titulo: string
  descripcion?: string | null
  estado: string
  fecha_inicio: string
  fecha_entrega?: string | null
  fecha_requerida?: string | null
  empresa: string
  updated_at: string
  actividad_responsables?: MeetResponsibleRow[] | null
}
type TopicRow = { id: string; actividad_id?: string | null; meetings?: { user_id: string } | { user_id: string }[] | null }
type ListTopicRow = { actividad_id?: string | null; meetings?: { id: string; title: string; user_id: string; empresas?: { nombre: string } | { nombre: string }[] | null } | { id: string; title: string; user_id: string; empresas?: { nombre: string } | { nombre: string }[] | null }[] | null }
type DirectoryUserRow = { id: string; equipo_id?: string | null; empresa_id?: string | null; equipos?: { id: string; nombre: string } | { id: string; nombre: string }[] | null; empresas?: { id: string; codigo: string; nombre: string } | { id: string; codigo: string; nombre: string }[] | null }

const { actividades, topics, usuarios, roleModules, empresas, departamentos, equipos } = TABLE_COLUMNS
const ONLY_ACTIVE = true
const ONLY_RECEIVING = true
const IS_OPERATOR = 'is'
const ONE_ROW = 1
/** The SQLSTATE `update_meet_activity` raises for a stale version; PostgREST answers it as HTTP 409. */
const VERSION_CONFLICT = 'PT409'

const first = <T>(value: T | T[] | null | undefined): T | null => Array.isArray(value) ? value[0] ?? null : value ?? null

/** A failure from the catalogue; `message` replaces the catalogue text with the database's. */
const failWith = (error: MeetError, message?: string): Failure => {
  const failure: Failure = { ok: false, ...error, message: message ?? error.message }
  return failure
}

const pickRef = ({ id, codigo, nombre }: MeetDepartmentRow) => {
  const ref: MeetDepartmentRow = { id, codigo, nombre }
  return ref
}

function canonical(row: ActivityRow): CanonicalMeetTask {
  const { principal, ...responsibles } = canonicalResponsibles(row.actividad_responsables)
  // Team and department are the principal's, as when a task had a single responsible.
  const team = first(principal?.equipos)
  const department = first(team?.departamentos)
  const task: CanonicalMeetTask = {
    id: row.id,
    titulo: row.titulo,
    descripcion: row.descripcion ?? null,
    ...responsibles,
    estado: row.estado,
    fecha_inicio: row.fecha_inicio,
    // fecha_requerida is only read-compatibility for historical rows.
    fecha_entrega: row.fecha_entrega ?? row.fecha_requerida ?? null,
    empresa: row.empresa,
    updated_at: row.updated_at,
    equipo: team && pickRef(team),
    departamento: department && pickRef(department),
  }
  return task
}

async function canManageActivity(client: SupabaseClient, activityId: string, authUserId: string) {
  const { data: topic, error } = await client
    .from(TABLES.topics)
    .select(MEET_PROJECTIONS.topicOwner)
    .eq(topics.actividadId, activityId)
    .limit(ONE_ROW)
    .maybeSingle()
  const row = topic as unknown as TopicRow | null
  return !error && Boolean(row) && first(row?.meetings)?.user_id === authUserId
}

export async function getCanonicalTask(client: SupabaseClient, activityId: string, authUserId?: string): Promise<ServiceResult<CanonicalMeetTask>> {
  if (authUserId && !(await canManageActivity(client, activityId, authUserId))) return failWith(MEET_ERRORS.taskReadForbidden)
  const { data, error } = await client.from(TABLES.actividades).select(MEET_PROJECTIONS.task).eq(actividades.id, activityId).maybeSingle()
  if (error) return failWith(MEET_ERRORS.taskReadDenied, error.message)
  if (!data) return failWith(MEET_ERRORS.taskNotFound)
  return { ok: true, data: canonical(data as unknown as ActivityRow) }
}

export async function listCanonicalTasks(client: SupabaseClient, authUserId: string, profileId: string): Promise<ServiceResult<CanonicalMeetTaskList>> {
  const [profileResult, directoryResult, activitiesResult, topicsResult] = await Promise.all([
    client.from(TABLES.usuarios).select(MEET_PROJECTIONS.viewerProfile).eq(usuarios.id, profileId).maybeSingle(),
    client.from(TABLES.usuarios).select(MEET_PROJECTIONS.directoryUser).eq(usuarios.activo, ONLY_ACTIVE),
    client.from(TABLES.actividades).select(MEET_PROJECTIONS.task),
    client.from(TABLES.topics).select(MEET_PROJECTIONS.topicOrigin).not(topics.actividadId, IS_OPERATOR, null),
  ])
  const error = profileResult.error || directoryResult.error || activitiesResult.error
  if (error || !profileResult.data) return failWith(MEET_ERRORS.taskListForbidden, error?.message)

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
    .filter((row) => (row.actividad_responsables ?? []).some(({ usuario_id }) => authorizedAssignees.has(usuario_id)) || ownedActivities.has(row.id))
    .map((row) => ({ ...canonical(row), meeting: origins.get(row.id) ?? null }))
  return { ok: true, data: {
    tasks,
    viewer: { profile_id: profileId, equipo: first(profile.equipos), empresa: first(profile.empresas) },
  } }
}

async function validateAssignee(client: SupabaseClient, id: string): Promise<Failure | null> {
  const { data: user, error } = await client.from(TABLES.usuarios).select(MEET_PROJECTIONS.assigneeCheck).eq(usuarios.id, id).maybeSingle()
  if (error || !user?.activo) return failWith(MEET_ERRORS.invalidAssigneeInactive)
  const roleQuery = client.from(TABLES.roleModules).select(roleModules.roleKey).eq(roleModules.roleKey, user.rol)
  const { data: modules, error: modulesError } = await roleQuery.eq(roleModules.moduleSlug, MODULE.TASKS)
  const lacksModule = !modules?.length && user.rol !== ADMIN_ROLE
  if (modulesError || lacksModule) return failWith(MEET_ERRORS.invalidAssigneeModule)
  return null
}

/** Every responsible must pass; the first failure answers. */
async function validateAssignees(client: SupabaseClient, ids: string[]): Promise<Failure | null> {
  for (const id of ids) {
    const invalid = await validateAssignee(client, id)
    if (invalid) return invalid
  }
  return null
}

async function validateCompany(client: SupabaseClient, code: string): Promise<Failure | null> {
  const companyQuery = client.from(TABLES.empresas).select(empresas.codigo).eq(empresas.codigo, code).eq(empresas.activo, ONLY_ACTIVE)
  const { data, error } = await companyQuery.eq(empresas.recibeActividades, ONLY_RECEIVING).maybeSingle()
  return error || !data ? failWith(MEET_ERRORS.invalidCompany) : null
}

async function manageableTopic(client: SupabaseClient, topicId: string, authUserId: string) {
  const { data, error } = await client.from(TABLES.topics).select(MEET_PROJECTIONS.topicLink).eq(topics.id, topicId).maybeSingle()
  const topic = data as unknown as TopicRow | null
  const meeting = first(topic?.meetings)
  return { allowed: !error && Boolean(topic) && meeting?.user_id === authUserId, topic }
}

/** Passes a failed result on as it came. */
const forward = ({ status, code, message }: ServiceResult<unknown>): Failure => {
  const failure: Failure = { ok: false, status: status!, code: code!, message: message! }
  return failure
}

export async function createTaskForTopic(client: SupabaseClient, authUserId: string, input: CreateMeetTaskInput): Promise<ServiceResult<{ task: CanonicalMeetTask; idempotent: boolean }>> {
  const access = await manageableTopic(client, input.topic_id, authUserId)
  if (!access.allowed) return failWith(MEET_ERRORS.topicForbidden)
  if (access.topic?.actividad_id) {
    const existing = await getCanonicalTask(client, access.topic.actividad_id)
    return existing.ok ? { ok: true, data: { task: existing.data!, idempotent: true } } : forward(existing)
  }
  // The contract guarantees at least one responsible on create.
  const responsibles = normalizeResponsibles(input)
  const assigneeIds = responsibles?.ids ?? []
  const invalidAssignee = await validateAssignees(client, assigneeIds)
  if (invalidAssignee) return invalidAssignee
  const invalidCompany = await validateCompany(client, input.empresa)
  if (invalidCompany) return invalidCompany
  const createParams = {
    p_topic_id: input.topic_id,
    p_titulo: input.titulo,
    p_descripcion: input.descripcion ?? null,
    p_responsable_ids: assigneeIds,
    p_lider_id: responsibles?.leaderId ?? null,
    p_fecha_inicio: input.fecha_inicio,
    p_fecha_entrega: input.fecha_entrega ?? null,
    p_empresa: input.empresa,
  }
  const { data: activityId, error } = await client.rpc(RPCS.createMeetActivityForTopic, createParams)
  if (error || !activityId) return failWith(MEET_ERRORS.taskCreateFailed, error?.message)
  const task = await getCanonicalTask(client, activityId as string)
  return task.ok ? { ok: true, data: { task: task.data!, idempotent: false } } : forward(task)
}

export async function updateTask(client: SupabaseClient, authUserId: string, activityId: string, input: UpdateMeetTaskInput): Promise<ServiceResult<CanonicalMeetTask>> {
  if (!(await canManageActivity(client, activityId, authUserId))) return failWith(MEET_ERRORS.taskManageForbidden)
  const responsibles = normalizeResponsibles(input)
  const invalidAssignee = await validateAssignees(client, responsibles?.ids ?? [])
  if (invalidAssignee) return invalidAssignee
  if (input.empresa) {
    const invalidCompany = await validateCompany(client, input.empresa)
    if (invalidCompany) return invalidCompany
  }
  const { expected_updated_at, responsable_id: _legacyId, responsable_ids: _ids, lider_id: _leaderId, ...changes } = input
  // One transaction in Postgres: version check, column changes and the responsible set together.
  const updateParams = {
    p_actividad_id: activityId,
    p_expected_updated_at: expected_updated_at,
    p_changes: changes,
    p_usuario_ids: responsibles?.ids ?? null,
    p_lider_id: responsibles?.leaderId ?? null,
    p_replace_responsibles: Boolean(responsibles),
  }
  const { error } = await client.rpc(RPCS.updateMeetActivity, updateParams)
  if (!error) return getCanonicalTask(client, activityId)
  const isOutdated = error.code === VERSION_CONFLICT
  if (!isOutdated) return failWith(MEET_ERRORS.taskUpdateForbidden, error.message)
  const current = await getCanonicalTask(client, activityId)
  const conflict = failWith(MEET_ERRORS.taskConflict)
  return current.ok ? { ...conflict, current: current.data } : conflict
}

export async function getTaskCatalogs(client: SupabaseClient): Promise<ServiceResult<unknown>> {
  const companiesQuery = client.from(TABLES.empresas).select(MEET_PROJECTIONS.catalogRow).eq(empresas.activo, ONLY_ACTIVE)
  const [companies, departments, teams] = await Promise.all([
    companiesQuery.eq(empresas.recibeActividades, ONLY_RECEIVING).order(empresas.nombre),
    client.from(TABLES.departamentos).select(MEET_PROJECTIONS.catalogRow).order(departamentos.nombre),
    client.from(TABLES.equipos).select(MEET_PROJECTIONS.teamRow).eq(equipos.activo, ONLY_ACTIVE).order(equipos.nombre),
  ])
  const error = companies.error || departments.error || teams.error
  if (error) return failWith(MEET_ERRORS.catalogsForbidden, error.message)
  return { ok: true, data: { states: [...COLUMNAS_KANBAN], companies: companies.data ?? [], departments: departments.data ?? [], teams: teams.data ?? [] } }
}

export async function getTaskAssignees(client: SupabaseClient): Promise<ServiceResult<unknown>> {
  const [users, modules] = await Promise.all([
    client.from(TABLES.usuarios).select(MEET_PROJECTIONS.assigneeRow).eq(usuarios.activo, ONLY_ACTIVE),
    client.from(TABLES.roleModules).select(roleModules.roleKey).eq(roleModules.moduleSlug, MODULE.TASKS),
  ])
  const error = users.error || modules.error
  if (error) return failWith(MEET_ERRORS.assigneesForbidden, error.message)
  const roles = new Set((modules.data ?? []).map((row: { role_key: string }) => row.role_key))
  const canBeAssigned = ({ rol }: UserRow) => rol === ADMIN_ROLE || Boolean(rol && roles.has(rol))
  const assignees = ((users.data ?? []) as unknown as UserRow[]).filter(canBeAssigned).map((user) => {
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
