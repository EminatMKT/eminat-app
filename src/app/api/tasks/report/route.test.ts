import { beforeEach, expect, it, vi } from 'vitest'
const { requireModule, ssrClient } = vi.hoisted(() => ({ requireModule: vi.fn(), ssrClient: vi.fn() }))
vi.mock('@/shared/db/requireAccess', () => ({ requireModule, ssrClient }))
import { GET } from './route'
const ownId = '11111111-1111-4111-8111-111111111111'
const otherId = '22222222-2222-4222-8222-222222222222'
const req = (query = '') => ({ nextUrl: new URL(`http://localhost/api/tasks/report${query}`) }) as never
function dbFor(role: string, rows: unknown[] = []) {
  const fields: string[] = []
  const filters: [string, string][] = []
  const activityQuery = {
    eq: (key: string, value: string) => { filters.push([key, value]); return activityQuery },
    order: () => activityQuery,
    gte: (key: string, value: string) => { filters.push([key, value]); return activityQuery },
    lt: (key: string, value: string) => { filters.push([key, value]); return activityQuery },
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
  }
  ssrClient.mockReturnValue({ from: (table: string) => table === 'usuarios'
    ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: ownId, rol: role, activo: true }, error: null }) }) }) }
    : { select: (columns: string) => { fields.push(columns); return activityQuery } },
  })
  return { fields, filters }
}
beforeEach(() => { vi.clearAllMocks(); requireModule.mockResolvedValue({ ok: true, userId: 'auth-1' }) })
it('rejects unauthenticated report requests', async () => {
  requireModule.mockResolvedValue({ ok: false, status: 401, error: 'No autenticado' })
  expect((await GET(req())).status).toBe(401)
  expect(ssrClient).not.toHaveBeenCalled()
})
it('rejects a worker asking for another user', async () => {
  const db = dbFor('stratix360')
  expect((await GET(req(`?user=${otherId}`))).status).toBe(403)
  expect(db.fields).toEqual([])
})
it('returns only own rows and operational fields to a worker', async () => {
  const db = dbFor('stratix360', [{ id: 'task-1', titulo: 'Own task', estado: 'Pendiente' }])
  const response = await GET(req('?month=2026-10'))
  expect(response.status).toBe(200)
  expect((await response.json()).scope).toBe('self')
  expect(db.filters).toContainEqual(['responsable_id', ownId])
  expect(db.filters).toContainEqual(['fecha_inicio', '2026-10-01'])
  expect(db.fields[0]).not.toMatch(/horas|dias_produccion|solicitante_id/)
})
it('allows admin to select another worker without productivity fields', async () => {
  const db = dbFor('admin')
  expect((await GET(req(`?user=${otherId}`))).status).toBe(200)
  expect(db.filters).toContainEqual(['responsable_id', otherId])
  expect(db.fields[0]).toContain('responsable_id')
  expect(db.fields[0]).not.toMatch(/horas|dias_produccion/)
})
it('rejects malformed periods', async () => {
  const db = dbFor('stratix360')
  expect((await GET(req('?month=2026-13'))).status).toBe(400)
  expect(db.fields).toEqual([])
})

it('denies an inactive profile even with a valid session', async () => {
  ssrClient.mockReturnValue({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: ownId, rol: 'stratix360', activo: false }, error: null }) }) }) }) })
  expect((await GET(req())).status).toBe(403)
})
