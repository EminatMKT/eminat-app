import { beforeEach, expect, it, vi } from 'vitest'
type Session = { ok: boolean; userId?: string; status?: number; error?: string }
type Row = Record<string, unknown>
interface Query {
  select(value: string): Query; eq(key: string, value: unknown): Query; in(key: string, value: string[]): Query;
  gte(key: string, value: string): Query; lt(key: string, value: string): Query; order(key: string, options?: { ascending: boolean }): Query; range(from: number, to: number): Query; limit(count: number): Query; returns(): Query; maybeSingle(): Query;
  then(resolve: (result: { data: Row | Row[] | null; error: { message: string } | null }) => unknown): Promise<unknown>
}
const fixture = vi.hoisted(() => ({ session: { ok: true, userId: 'auth-employee' } as Session, role: 'employee', status: 'active', org: 'stratix', orgStatus: 'active', identity: 'auth-employee', errorTable: '', inactive: false, scoped: true, activities: null as Row[] | null, assignments: null as Row[] | null, calls: [] as { table: string; privileged: boolean; fields: string; filters: [string, string, unknown][] }[] }))
const ids = { employee: '11111111-1111-4111-8111-111111111111', admin: '22222222-2222-4222-8222-222222222222', superadmin: '33333333-3333-4333-8333-333333333333', foreign: '44444444-4444-4444-8444-444444444444' }
const profile = (role: string) => ({ id: ids[role as keyof typeof ids], auth_id: `auth-${role}`, rol: role === 'employee' ? 'stratix360' : 'admin', activo: !fixture.inactive, empresa_id: role === 'foreign' ? 'other' : 'stratix-company', nombre: role, apellido: 'QA' })
function query(table: string, privileged = false) {
  const filters: [string, string, unknown][] = []; let fields = '', single = false, from = 0, to = Infinity
  const orders: [string, boolean][] = []
  const q: Query = {
    select(value: string) { fields = value; return q },
    eq(key: string, value: unknown) { filters.push(['eq', key, value]); return q },
    in(key: string, value: string[]) { filters.push(['in', key, value]); return q },
    gte(key, value) { filters.push(['gte', key, value]); return q }, lt(key, value) { filters.push(['lt', key, value]); return q },
    order(key, options) { orders.push([key, options?.ascending !== false]); return q }, range(start, end) { from = start; to = end; return q }, limit(count) { to = count - 1; return q }, returns() { return q },
    maybeSingle() { single = true; return q },
    then(resolve) {
      fixture.calls.push({ table, privileged, fields, filters })
      if (privileged && table !== 'sales_members') throw Error('Privileged operational read prohibited')
      let rows: Row[] = []
      if (table === 'usuarios') rows = ['employee','admin','superadmin','foreign'].map(profile)
      if (table === 'sales_members') rows = [{ user_id: ids[fixture.role as keyof typeof ids], auth_id: fixture.identity,
        role: fixture.role === 'superadmin' ? 'SUPERADMIN' : 'ADMIN', status: fixture.status,
        sales_organizations: { code: fixture.org, status: fixture.orgStatus } }]
      if (table === 'empresas') rows = fixture.scoped ? [{ id: 'stratix-company', codigo: 'S' }] : []
      if (table === 'usuario_empresas_acceso') rows = fixture.scoped ? ['employee','admin','superadmin'].map(role => ({ usuario_id: ids[role as keyof typeof ids], empresa_codigo: 'S' })) : []
      const assignees = fixture.assignments ?? [{ actividad_id: 'work', usuario_id: ids[fixture.role as keyof typeof ids], es_lider: true }]
      if (table === 'actividad_responsables') rows = assignees
      if (table === 'actividades') rows = (fixture.activities ?? [{ id: 'work', titulo: 'Campaña QA', descripcion: 'Descripción legítima de trabajo.', estado: 'Completado', empresa: 'S', fecha_inicio: '2026-10-10', fecha_entrega: '2026-10-20', horas: 7.5, dias_produccion: 1.5, totalTasks: 99, responsable_id: ids[fixture.role as keyof typeof ids] },
        { id: 'foreign-work', titulo: 'Private foreign work', empresa: 'OTHER', responsable_id: ids.foreign, fecha_inicio: '2026-10-10' }]).filter(row => row.rlsDenied !== true)
        .map(row => ({ ...row, actividad_responsables: assignees.filter(person => person.actividad_id === row.id) }))
      rows = rows.filter(row => filters.every(([op, key, value]) => {
        if (key.startsWith('sales_organizations.')) return (row.sales_organizations as Row)?.[key.split('.')[1]] === value
        if (op === 'gte') return String(row[key]) >= String(value)
        if (op === 'lt') return String(row[key]) < String(value)
        return op === 'in' ? (value as unknown[]).includes(row[key]) : row[key] === value
      }))
      rows.sort((left, right) => { for (const [key, ascending] of orders) { const compared = String(left[key] ?? '').localeCompare(String(right[key] ?? '')); if (compared) return ascending ? compared : -compared } return 0 })
      rows = rows.slice(from, to === Infinity ? undefined : to + 1)
      return Promise.resolve(resolve({ data: table === fixture.errorTable ? null : single ? rows[0] ?? null : rows, error: table === fixture.errorTable ? { message: 'private diagnostic' } : null }))
    },
  }
  return q
}
vi.mock('@/shared/db/requireAccess/requireModule', () => ({ default: vi.fn(async () => fixture.session) }))
vi.mock('@/shared/db/requireAccess/ssrClient', () => ({ default: () => ({ from: (table: string) => query(table) }) }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: () => ({ from: (table: string) => query(table, true) }) }))
import { GET } from './route'
import { GET as PDF } from './pdf/route'
const request = (query = '?month=2026-10') => ({ nextUrl: new URL(`http://localhost/api/tasks/report${query}`) }) as never
beforeEach(() => Object.assign(fixture, { session: { ok: true, userId: 'auth-employee' }, role: 'employee', status: 'active', org: 'stratix', orgStatus: 'active', identity: 'auth-employee', errorTable: '', inactive: false, scoped: true, activities: null, assignments: null, calls: [] }))
function as(role: string) { fixture.role = role; fixture.identity = `auth-${role}`; fixture.session.userId = `auth-${role}` }
it.each(['employee','admin','superadmin'])('%s receives descriptions/statuses and role-specific metrics from authenticated reads', async role => {
  as(role)
  const response = await GET(request()); expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  const report = await response.json(); expect(report.tasks[0]).toMatchObject({ descripcion: 'Descripción legítima de trabajo.', estado: 'Completado' })
  expect(report.tasks).toHaveLength(1); expect(JSON.stringify(report)).not.toContain('foreign')
  if (role === 'superadmin') { expect(report.metrics.totalHours).toBe(7.5); expect(report.metrics.completedTasks).toBe(1) }
  else { expect(report).not.toHaveProperty('metrics'); expect(report.tasks[0]).not.toHaveProperty('horas') }
  expect(fixture.calls.filter(c => c.table === 'actividades').every(c => !c.privileged && c.fields.includes('horas') === (role === 'superadmin'))).toBe(true)
  expect(fixture.calls.filter(c => c.privileged).map(c => c.table)).toEqual(['sales_members'])
  const pdf = await PDF(request()); expect(pdf.status).toBe(200); expect(pdf.headers.get('Content-Type')).toBe('application/pdf')
  expect(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString()).toBe('%PDF')
})
it.each(['admin','superadmin'])('%s can select an authorized colleague but not a foreign employee', async role => {
  as(role); expect((await GET(request(`?month=2026-10&user=${ids.employee}`))).status).toBe(200)
  expect((await GET(request(`?month=2026-10&user=${ids.foreign}`))).status).toBe(403)
})
it('employee cannot request another person, including PDF and forged privilege flags', async () => {
  for (const endpoint of [GET, PDF]) expect((await endpoint(request(`?month=2026-10&user=${ids.admin}&superadmin=true`))).status).toBe(403)
  expect(fixture.calls.some(c => c.table === 'actividades')).toBe(false)
})
it.each(['status','org','orgStatus','identity'])('SUPERADMIN metrics require valid %s as well as the role', async key => {
  as('superadmin'); fixture[key as 'status' | 'org' | 'orgStatus' | 'identity'] = 'invalid'
  const response = await GET(request()); expect(response.status).toBe(200); expect(await response.json()).not.toHaveProperty('metrics')
})
it.each([401,403])('rejects session/module denial %s before queries', async status => {
  fixture.session = { ok: false, status, error: 'Denied' }
  expect((await GET(request())).status).toBe(status); expect((await PDF(request())).status).toBe(status); expect(fixture.calls).toEqual([])
})
it.each(['?month=2026-13','?month=0000-01','?user=bad'])('rejects malformed input %s', async params => {
  expect((await GET(request(params))).status).toBe(400); expect(fixture.calls).toEqual([])
})
it('rejects inactive profiles and absent company/project scope', async () => {
  fixture.inactive = true; expect((await GET(request())).status).toBe(403)
  fixture.inactive = false; fixture.scoped = false; expect((await GET(request())).status).toBe(403)
})
it.each(['usuarios','sales_members','usuario_empresas_acceso','project_members','empresas','actividades','actividad_responsables'])('fails closed on %s read failure', async table => {
  fixture.errorTable = table; const response = await GET(request()); expect(response.status).toBe(503)
  expect(await response.text()).not.toContain('private diagnostic')
})

it('restores the September historical structure: 83 assigned/requested tasks, 56 completed, 10 executor hours and 6 production days', async () => {
  as('superadmin')
  const tasks: Row[] = Array.from({ length: 83 }, (_, i) => ({ id: `history-${i}`, titulo: `Historical structure QA ${i}`, descripcion: `Work description ${i}`,
    empresa: i === 0 ? 'AUTHORIZED-OTHER-BRAND' : 'S', responsable_id: i >= 77 ? ids.superadmin : ids.employee,
    solicitante_id: ids.superadmin, estado: i < 56 ? 'Completado' : i % 2 ? 'Pendiente' : 'En proceso',
    fecha_inicio: '2026-09-10', fecha_entrega: '2026-09-25', horas: i >= 78 ? 2 : i === 77 ? 0 : 8, dias_produccion: i >= 77 ? 1 : 2 }))
  fixture.activities = [...tasks, { ...tasks[0], id: 'unrelated', solicitante_id: ids.admin }, { ...tasks[0], id: 'different-year', fecha_inicio: '2025-09-10' },
    { ...tasks[0], id: 'outside-rls', rlsDenied: true }]
  // The six personal rows are legacy primary assignments with no join rows.
  fixture.assignments = tasks.slice(0,77).map(row => ({ actividad_id: row.id, usuario_id: ids.employee, es_lider: true }))
  const response = await GET(request('?month=2026-09')); expect(response.status).toBe(200)
  const report = await response.json()
  expect(report.tasks).toHaveLength(83)
  expect(report.metrics).toMatchObject({ totalTasks: 83, completedTasks: 56, totalHours: 10, productionDays: 6 })
  expect(report.tasks.find((row: {id:string}) => row.id === 'history-0')).toMatchObject({ empresa:'AUTHORIZED-OTHER-BRAND', assignedEmployees:[{ id:ids.employee, name:'employee QA', leader:true }] })
  expect(fixture.calls.filter(call => call.table === 'actividades').every(call => !call.privileged && !call.fields.includes('!inner'))).toBe(true)
  const pdf = await PDF(request('?month=2026-09'))
  const { PDFDocument } = await import('pdf-lib')
  expect((await PDFDocument.load(await pdf.arrayBuffer())).getPageCount()).toBeGreaterThan(1)
})
it('includes employee legacy and collaborator assignments regardless of status, but never requested-only work or metrics', async () => {
  fixture.activities = ['Pendiente','En proceso','Completado','Por aprobar','Cancelado'].map((estado,i) => ({ id:`own-${i}`, titulo:estado, estado,
    descripcion:'Authorized work', empresa:'S', responsable_id: i < 4 ? ids.employee : ids.admin, solicitante_id:ids.admin, fecha_inicio:'2026-09-10', fecha_entrega:'2026-09-20', horas:99, dias_produccion:50 }))
  fixture.activities.push({ ...fixture.activities[0], id:'requested-only', responsable_id:ids.admin, solicitante_id:ids.employee })
  fixture.activities.push({ ...fixture.activities[0], id:'stale-legacy', responsable_id:ids.employee })
  fixture.assignments = [{ actividad_id:'stale-legacy',usuario_id:ids.admin,es_lider:true }, { actividad_id:'own-4', usuario_id:ids.employee, es_lider:false }, { actividad_id:'own-4', usuario_id:ids.admin, es_lider:true }]
  const report = await (await GET(request('?month=2026-09'))).json()
  expect(report.tasks).toHaveLength(5); expect(report).not.toHaveProperty('metrics')
  for (const task of report.tasks) { expect(task).not.toHaveProperty('horas'); expect(task).not.toHaveProperty('dias_produccion') }
  expect(report.tasks.map((task:{estado:string})=>task.estado)).toEqual(expect.arrayContaining(['Pendiente','En proceso','Completado','Por aprobar','Cancelado']))
})
it('paginates supervised work and deduplicates primary, collaborator, and requester matches across reporting periods', async () => {
  as('superadmin')
  fixture.activities = Array.from({length:503},(_,i)=>({ id:`page-${i.toString().padStart(4,'0')}`, titulo:'Delegated work', descripcion:'Complete paginated work', empresa:'S', responsable_id:i===0?ids.superadmin:ids.employee,
    solicitante_id:ids.superadmin, estado:'Pendiente', fecha_inicio:'2026-08-15', fecha_entrega:'2026-08-30', horas:2, dias_produccion:1 }))
  fixture.assignments = [{ actividad_id:'page-0000',usuario_id:ids.superadmin,es_lider:true }]
  const report = await (await GET(request('?month=2026-08'))).json()
  expect(report.tasks).toHaveLength(503); expect(report.metrics.totalHours).toBe(2)
  expect((await (await GET(request('?month=2026-09'))).json()).tasks).toEqual([])
})
