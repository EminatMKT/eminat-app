import { describe, expect, it } from 'vitest'
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { createTaskForTopic, getCanonicalTask, getTaskAssignees, getTaskCatalogs, listCanonicalTasks, updateTask } from './task-service'

type Result = { data: unknown; error: (Pick<PostgrestError, 'message'> & Partial<Pick<PostgrestError, 'code'>>) | null }
type Scripts = Record<string, Result[]>
type Call = { table: string; method: string; args: unknown[] }

function fakeClient(initial: Scripts) {
  const scripts = Object.fromEntries(Object.entries(initial).map(([key, values]) => [key, [...values]])) as Scripts
  const calls: Call[] = []
  const take = (table: string): Result => scripts[table]?.shift() ?? { data: null, error: null }
  const from = (table: string) => {
    const query: Record<string, unknown> = {}
    for (const method of ['select', 'update', 'insert', 'eq', 'limit', 'order', 'not']) {
      query[method] = (...args: unknown[]) => { calls.push({ table, method, args }); return query }
    }
    query.maybeSingle = async () => take(table)
    query.then = (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(take(table)).then(resolve, reject)
    return query
  }
  const rpc = async (name: string, params: unknown) => {
    const call = { table: 'rpc', method: name, args: [params] }
    calls.push(call)
    return take(`rpc:${name}`)
  }
  const fake = { from, rpc }
  return { client: fake as unknown as SupabaseClient, calls }
}

const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const activityId = '11111111-1111-4111-8111-111111111111'
const assigneeId = '22222222-2222-4222-8222-222222222222'
const secondId = '66666666-6666-4666-8666-666666666666'
const topic = { id: 'topic-1', meetings: { user_id: owner } }
const team = {
  id: 'team-1',
  codigo: 'MKT',
  nombre: 'Marketing',
  activo: true,
  departamentos: { id: 'dep-1', codigo: 'MKT', nombre: 'Marketing' },
}
const ana = {
  id: assigneeId,
  nombre_display: 'Ana Pérez',
  nombre: 'Ana',
  apellido: 'Pérez',
  equipos: team,
}
const beto = {
  id: secondId,
  nombre_display: 'Beto Ruiz',
  nombre: 'Beto',
  apellido: 'Ruiz',
  equipos: null,
}
function responsibleRow(usuario: { id: string }, esLider = false) {
  const row = { usuario_id: usuario.id, es_lider: esLider, usuarios: usuario }
  return row
}
const noOverrides: Record<string, unknown> = {}
function activity(over = noOverrides) {
  const row = {
    id: activityId,
    titulo: 'Task CRM',
    descripcion: 'Detalle',
    estado: 'Pendiente',
    fecha_inicio: '2026-09-18',
    fecha_entrega: '2026-09-30',
    fecha_requerida: null,
    empresa: 'STRATIX',
    updated_at: '2026-09-18T13:00:00Z',
    actividad_responsables: [responsibleRow(ana)],
    ...over,
  }
  return row
}
function ok(data: unknown): Result {
  const result = { data, error: null }
  return result
}
function activeUser(id: string) {
  const user = { id, rol: 'colaborador', activo: true }
  return user
}
const tasksModule = [{ role_key: 'colaborador' }]
const stratix = { codigo: 'STRATIX' }
const freeTopic = { id: 'topic-1', actividad_id: null, meetings: { user_id: owner } }
const stamp = '2026-09-18T13:00:00Z'
const rpcCallOf = (calls: Call[]) => calls.find((call) => call.table === 'rpc')?.args[0]
function activityOf(id: string, responsibles: ReturnType<typeof responsibleRow>[]) {
  const row = activity()
  row.id = id
  row.actividad_responsables = responsibles
  return row
}

describe('Meet task service', () => {
  it('saves columns in one RPC with the expected version and answers the fresh task', async () => {
    const saved = activity({ titulo: 'Cambio Meet', updated_at: '2026-09-18T14:00:00Z' })
    const { client, calls } = fakeClient({
      topics: [ok(topic)],
      'rpc:update_meet_activity': [ok(null)],
      actividades: [ok(saved)],
    })
    const input = { expected_updated_at: '2026-09-18T13:00:00Z', titulo: 'Cambio Meet' }
    const result = await updateTask(client, owner, activityId, input)
    const expectedRpc = {
      p_actividad_id: activityId,
      p_expected_updated_at: '2026-09-18T13:00:00Z',
      p_changes: { titulo: 'Cambio Meet' },
      p_usuario_ids: null,
      p_lider_id: null,
      p_replace_responsibles: false,
    }
    expect(result.ok).toBe(true)
    expect(result.data?.updated_at).toBe('2026-09-18T14:00:00Z')
    expect(rpcCallOf(calls)).toEqual(expectedRpc)
    // One transaction: the service never writes the table itself.
    expect(calls.some((call) => call.table === 'actividades' && call.method === 'update')).toBe(false)
  })

  it('maps the RPC version conflict (PT409) to 409 with the current task', async () => {
    const current = activity({ titulo: 'Cambio CRM', updated_at: '2026-09-18T14:00:00Z' })
    const stale = { data: null, error: { message: 'version_vencida', code: 'PT409' } }
    const { client } = fakeClient({
      topics: [ok(topic)],
      'rpc:update_meet_activity': [stale],
      actividades: [ok(current)],
    })
    const input = { expected_updated_at: '2026-09-18T13:00:00Z', titulo: 'Cambio Meet' }
    const result = await updateTask(client, owner, activityId, input)
    expect(result).toMatchObject({ ok: false, status: 409, code: 'TASK_CONFLICT' })
    expect(result.current?.titulo).toBe('Cambio CRM')
    expect(result.current?.updated_at).toBe('2026-09-18T14:00:00Z')
  })

  it('rechaza responsable inactivo antes de tocar la Activity', async () => {
    const { client, calls } = fakeClient({
      topics: [{ data: topic, error: null }],
      usuarios: [{ data: { id: assigneeId, rol: 'colaborador', activo: false }, error: null }],
    })
    const result = await updateTask(client, owner, activityId, {
      expected_updated_at: '2026-09-18T13:00:00Z', responsable_id: assigneeId,
    })
    expect(result).toMatchObject({ ok: false, status: 422, code: 'INVALID_ASSIGNEE' })
    expect(calls.some((call) => call.table === 'actividades')).toBe(false)
  })

  it('rechaza una empresa que no está habilitada para Activities', async () => {
    const { client, calls } = fakeClient({
      topics: [{ data: topic, error: null }],
      empresas: [{ data: null, error: null }],
    })
    const result = await updateTask(client, owner, activityId, {
      expected_updated_at: '2026-09-18T13:00:00Z', empresa: 'INACTIVA',
    })
    expect(result).toMatchObject({ ok: false, status: 422, code: 'INVALID_COMPANY' })
    expect(calls.some((call) => call.table === 'actividades')).toBe(false)
  })

  it('legacy responsable_id replaces the set in the same RPC as the columns', async () => {
    const fresh = activity()
    fresh.updated_at = '2026-09-18T15:00:00Z'
    const scripts = {
      topics: [ok(topic)],
      usuarios: [ok(activeUser(assigneeId))],
      role_modules: [ok(tasksModule)],
      empresas: [ok(stratix)],
      'rpc:update_meet_activity': [ok(null)],
      actividades: [ok(fresh)],
    }
    const { client, calls } = fakeClient(scripts)
    const input = { expected_updated_at: stamp, responsable_id: assigneeId, empresa: 'STRATIX' }
    const result = await updateTask(client, owner, activityId, input)
    const expectedRpc = {
      p_actividad_id: activityId,
      p_expected_updated_at: stamp,
      p_changes: { empresa: 'STRATIX' },
      p_usuario_ids: [assigneeId],
      p_lider_id: null,
      p_replace_responsibles: true,
    }
    expect(rpcCallOf(calls)).toEqual(expectedRpc)
    expect(result.data?.responsable_id).toBe(assigneeId)
    expect(result.data?.updated_at).toBe('2026-09-18T15:00:00Z')
  })

  it('responsable_ids validates every assignee and sends the leader in the one RPC', async () => {
    const fresh = activity()
    fresh.actividad_responsables = [responsibleRow(ana), responsibleRow(beto, true)]
    const scripts = {
      topics: [ok(topic)],
      usuarios: [ok(activeUser(assigneeId)), ok(activeUser(secondId))],
      role_modules: [ok(tasksModule), ok(tasksModule)],
      'rpc:update_meet_activity': [ok(null)],
      actividades: [ok(fresh)],
    }
    const { client, calls } = fakeClient(scripts)
    const input = { expected_updated_at: stamp, responsable_ids: [assigneeId, secondId], lider_id: secondId }
    const result = await updateTask(client, owner, activityId, input)
    const expectedRpc = {
      p_actividad_id: activityId,
      p_expected_updated_at: stamp,
      p_changes: {},
      p_usuario_ids: [assigneeId, secondId],
      p_lider_id: secondId,
      p_replace_responsibles: true,
    }
    expect(rpcCallOf(calls)).toEqual(expectedRpc)
    expect(result.data?.responsable_id).toBe(secondId)
    expect(result.data?.responsables.map((row) => row.id)).toEqual([secondId, assigneeId])
  })

  it('create sends the array shape to the RPC, also for a legacy single id', async () => {
    const scripts = {
      topics: [ok(freeTopic)],
      usuarios: [ok(activeUser(assigneeId))],
      role_modules: [ok(tasksModule)],
      empresas: [ok(stratix)],
      'rpc:create_meet_activity_for_topic': [ok(activityId)],
      actividades: [ok(activity())],
    }
    const { client, calls } = fakeClient(scripts)
    const input = {
      topic_id: activityId,
      titulo: 'Task',
      responsable_id: assigneeId,
      fecha_inicio: '2026-09-18',
      empresa: 'STRATIX',
    }
    const result = await createTaskForTopic(client, owner, input)
    const expectedParams = { p_responsable_ids: [assigneeId], p_lider_id: null }
    expect(result.data?.task.responsables).toHaveLength(1)
    expect(rpcCallOf(calls)).toMatchObject(expectedParams)
    expect(rpcCallOf(calls)).not.toHaveProperty('p_responsable_id')
  })

  it('sirve catálogos y responsables desde las tablas del CRM', async () => {
    const catalogs = fakeClient({
      empresas: [{ data: [{ id: 'e1', codigo: 'STRATIX', nombre: 'Stratix' }], error: null }],
      departamentos: [{ data: [{ id: 'd1', codigo: 'MKT', nombre: 'Marketing' }], error: null }],
      equipos: [{ data: [{ id: 't1', codigo: 'MKT', nombre: 'Marketing', departamento_id: 'd1', activo: true }], error: null }],
    })
    const catalogResult = await getTaskCatalogs(catalogs.client)
    expect(catalogResult.ok).toBe(true)
    expect(catalogResult.data).toMatchObject({
      companies: [{ codigo: 'STRATIX' }], departments: [{ codigo: 'MKT' }], teams: [{ codigo: 'MKT' }],
    })

    const assignee = { ...ana, rol: 'colaborador' }
    const assignees = fakeClient({
      usuarios: [{ data: [assignee], error: null }],
      role_modules: [{ data: [{ role_key: 'colaborador' }], error: null }],
    })
    const assigneeResult = await getTaskAssignees(assignees.client)
    expect(assigneeResult.ok).toBe(true)
    expect(assigneeResult.data).toMatchObject({ assignees: [{ id: assigneeId, nombre: 'Ana Pérez' }] })
  })

  it('un refresh de Meet refleja un cambio intermedio hecho en CRM', async () => {
    const changed = activity({ titulo: 'Editada en CRM', empresa: 'EMC', updated_at: '2026-09-18T15:00:00Z' })
    const { client } = fakeClient({
      topics: [{ data: topic, error: null }, { data: topic, error: null }],
      actividades: [{ data: activity(), error: null }, { data: changed, error: null }],
    })
    const before = await getCanonicalTask(client, activityId, owner)
    const after = await getCanonicalTask(client, activityId, owner)
    expect(before.data?.titulo).toBe('Task CRM')
    expect(after.data).toMatchObject({ titulo: 'Editada en CRM', empresa: 'EMC', updated_at: '2026-09-18T15:00:00Z' })
  })

  it('lista únicamente Tasks propias, del equipo, de la empresa o de reuniones creadas por el actor', async () => {
    const other = '33333333-3333-4333-8333-333333333333'
    const outsider = { id: other }
    const owned = activityOf('44444444-4444-4444-8444-444444444444', [responsibleRow(outsider)])
    const forbidden = activityOf('55555555-5555-4555-8555-555555555555', [responsibleRow(outsider)])
    // Any responsible inside the viewer's scope is enough: the team member is second here.
    const shared = activityOf('77777777-7777-4777-8777-777777777777', [responsibleRow(outsider, true), responsibleRow(ana)])
    const { client } = fakeClient({
      usuarios: [
        { data: { id: assigneeId, equipo_id: 'team-1', empresa_id: 'company-1' }, error: null },
        { data: [
          { id: assigneeId, equipo_id: 'team-1', empresa_id: 'company-1' },
          { id: other, equipo_id: 'team-2', empresa_id: 'company-2' },
        ], error: null },
      ],
      actividades: [ok([activity(), owned, forbidden, shared])],
      topics: [{ data: [{
        actividad_id: owned.id,
        meetings: { id: 'meeting-1', title: 'Reunión propia', user_id: owner, empresas: { nombre: 'Stratix' } },
      }], error: null }],
    })
    const result = await listCanonicalTasks(client, owner, assigneeId)
    expect(result.ok).toBe(true)
    expect(result.data?.tasks.map((task) => task.id)).toEqual([activityId, owned.id, shared.id])
    expect(result.data?.tasks[1].meeting).toEqual({ id: 'meeting-1', title: 'Reunión propia', company: 'Stratix' })
    expect(result.data?.viewer).toEqual({ profile_id: assigneeId, equipo: null, empresa: null })
  })
})
