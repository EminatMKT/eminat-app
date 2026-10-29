import { beforeEach, expect, it, vi } from 'vitest'
type Session = { ok: boolean; userId?: string; status?: number; error?: string }
type Row = Record<string, unknown>
interface Query {
  select(value: string): Query; eq(key: string, value: unknown): Query; in(key: string, value: string[]): Query;
  gte(): Query; lt(): Query; order(): Query; range(): Query; limit(): Query; returns(): Query; maybeSingle(): Query;
  then(resolve: (result: { data: Row | Row[] | null; error: { message: string } | null }) => unknown): Promise<unknown>
}
const fixture = vi.hoisted(() => ({ session: { ok: true, userId: 'auth-employee' } as Session, role: 'employee', status: 'active', org: 'stratix', orgStatus: 'active', identity: 'auth-employee', errorTable: '', inactive: false, scoped: true, calls: [] as { table: string; privileged: boolean; fields: string; filters: [string, string, unknown][] }[] }))
const ids = { employee: '11111111-1111-4111-8111-111111111111', admin: '22222222-2222-4222-8222-222222222222', superadmin: '33333333-3333-4333-8333-333333333333', foreign: '44444444-4444-4444-8444-444444444444' }
const profile = (role: string) => ({ id: ids[role as keyof typeof ids], auth_id: `auth-${role}`, rol: role === 'employee' ? 'stratix360' : 'admin', activo: !fixture.inactive, empresa_id: role === 'foreign' ? 'other' : 'stratix-company', nombre: role, apellido: 'QA' })
function query(table: string, privileged = false) {
  const filters: [string, string, unknown][] = []; let fields = '', single = false
  const q: Query = {
    select(value: string) { fields = value; return q },
    eq(key: string, value: unknown) { filters.push(['eq', key, value]); return q },
    in(key: string, value: string[]) { filters.push(['in', key, value]); return q },
    gte() { return q }, lt() { return q }, order() { return q }, range() { return q }, limit() { return q }, returns() { return q },
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
      if (table === 'actividades') rows = [{ id: 'work', titulo: 'Campaña QA', descripcion: 'Descripción legítima de trabajo.', estado: 'Completado', empresa: 'S', fecha_inicio: '2026-10-10', fecha_entrega: '2026-10-20', horas: 7.5, totalTasks: 99, 'actividad_responsables.usuario_id': filters.find(f => f[1] === 'actividad_responsables.usuario_id')?.[2] },
        { id: 'foreign-work', titulo: 'Private foreign work', empresa: 'OTHER', 'actividad_responsables.usuario_id': ids.foreign }]
      rows = rows.filter(row => filters.every(([op, key, value]) => {
        if (key.startsWith('sales_organizations.')) return (row.sales_organizations as Row)?.[key.split('.')[1]] === value
        return op === 'in' ? (value as unknown[]).includes(row[key]) : row[key] === value
      }))
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
beforeEach(() => Object.assign(fixture, { session: { ok: true, userId: 'auth-employee' }, role: 'employee', status: 'active', org: 'stratix', orgStatus: 'active', identity: 'auth-employee', errorTable: '', inactive: false, scoped: true, calls: [] }))
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
it.each(['usuarios','sales_members','usuario_empresas_acceso','project_members','empresas','actividades'])('fails closed on %s read failure', async table => {
  fixture.errorTable = table; const response = await GET(request()); expect(response.status).toBe(503)
  expect(await response.text()).not.toContain('private diagnostic')
})
