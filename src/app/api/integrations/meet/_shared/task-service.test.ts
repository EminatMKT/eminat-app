import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getCanonicalTask, getTaskAssignees, getTaskCatalogs, listCanonicalTasks, updateTask } from './task-service'

type Result = { data: unknown; error: { message: string } | null }
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
  return { client: { from } as unknown as SupabaseClient, calls }
}

const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const activityId = '11111111-1111-4111-8111-111111111111'
const assigneeId = '22222222-2222-4222-8222-222222222222'
const topic = { id: 'topic-1', meetings: { user_id: owner } }
const activity = (over: Record<string, unknown> = {}) => ({
  id: activityId, titulo: 'Task CRM', descripcion: 'Detalle', responsable_id: assigneeId,
  estado: 'Pendiente', fecha_inicio: '2026-09-18', fecha_entrega: '2026-09-30',
  fecha_requerida: null, empresa: 'STRATIX', updated_at: '2026-09-18T13:00:00Z',
  usuarios: { id: assigneeId, nombre_display: 'Ana Pérez', equipos: {
    id: 'team-1', codigo: 'MKT', nombre: 'Marketing', activo: true,
    departamentos: { id: 'dep-1', codigo: 'MKT', nombre: 'Marketing' },
  } },
  ...over,
})

describe('Meet task service', () => {
  it('actualiza con expected_updated_at y devuelve el timestamp nuevo', async () => {
    const saved = activity({ titulo: 'Cambio Meet', updated_at: '2026-09-18T14:00:00Z' })
    const { client, calls } = fakeClient({
      topics: [{ data: topic, error: null }],
      actividades: [{ data: saved, error: null }],
    })

    const result = await updateTask(client, owner, activityId, {
      expected_updated_at: '2026-09-18T13:00:00Z', titulo: 'Cambio Meet',
    })

    expect(result.ok).toBe(true)
    expect(result.data?.updated_at).toBe('2026-09-18T14:00:00Z')
    expect(calls).toContainEqual({ table: 'actividades', method: 'eq', args: ['updated_at', '2026-09-18T13:00:00Z'] })
  })

  it('devuelve conflicto y la versión canónica vigente', async () => {
    const current = activity({ titulo: 'Cambio CRM', updated_at: '2026-09-18T14:00:00Z' })
    const { client } = fakeClient({
      topics: [{ data: topic, error: null }],
      actividades: [{ data: null, error: null }, { data: current, error: null }],
    })

    const result = await updateTask(client, owner, activityId, {
      expected_updated_at: '2026-09-18T13:00:00Z', titulo: 'Cambio Meet',
    })

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

  it('acepta responsable con Tasks y empresa habilitada', async () => {
    const saved = activity({ responsable_id: assigneeId, empresa: 'STRATIX', updated_at: '2026-09-18T14:00:00Z' })
    const { client } = fakeClient({
      topics: [{ data: topic, error: null }],
      usuarios: [{ data: { id: assigneeId, rol: 'colaborador', activo: true }, error: null }],
      role_modules: [{ data: [{ role_key: 'colaborador' }], error: null }],
      empresas: [{ data: { codigo: 'STRATIX' }, error: null }],
      actividades: [{ data: saved, error: null }],
    })
    const result = await updateTask(client, owner, activityId, {
      expected_updated_at: '2026-09-18T13:00:00Z',
      responsable_id: assigneeId,
      empresa: 'STRATIX',
    })
    expect(result.ok).toBe(true)
    expect(result.data).toMatchObject({ responsable_id: assigneeId, empresa: 'STRATIX' })
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

    const assignee = { ...(activity().usuarios as Record<string, unknown>), rol: 'colaborador' }
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
    const owned = activity({ id: '44444444-4444-4444-8444-444444444444', responsable_id: other })
    const forbidden = activity({ id: '55555555-5555-4555-8555-555555555555', responsable_id: other })
    const { client } = fakeClient({
      usuarios: [
        { data: { id: assigneeId, equipo_id: 'team-1', empresa_id: 'company-1' }, error: null },
        { data: [
          { id: assigneeId, equipo_id: 'team-1', empresa_id: 'company-1' },
          { id: other, equipo_id: 'team-2', empresa_id: 'company-2' },
        ], error: null },
      ],
      actividades: [{ data: [activity(), owned, forbidden], error: null }],
      topics: [{ data: [{
        actividad_id: owned.id,
        meetings: { id: 'meeting-1', title: 'Reunión propia', user_id: owner, empresas: { nombre: 'Stratix' } },
      }], error: null }],
    })
    const result = await listCanonicalTasks(client, owner, assigneeId)
    expect(result.ok).toBe(true)
    expect(result.data?.tasks.map((task) => task.id)).toEqual([activityId, owned.id])
    expect(result.data?.tasks[1].meeting).toEqual({ id: 'meeting-1', title: 'Reunión propia', company: 'Stratix' })
    expect(result.data?.viewer).toEqual({ profile_id: assigneeId, equipo: null, empresa: null })
  })
})
