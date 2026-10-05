import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mock = vi.hoisted(() => ({ admin: false, projectAccessible: true, calls: [] as [string, string, unknown][], tables: [] as string[] }))
vi.mock('@/shared/db/requireAccess/requireModule', () => ({ default: async () => ({ ok: true, userId: 'auth-user' }) }))
vi.mock('@/shared/db/requireAccess/ssrClient', () => ({
  default: () => ({
    from: (table: string) => {
      mock.tables.push(table)
      const query: Record<string, (...args: unknown[]) => unknown> = {}
      for (const method of ['select', 'eq', 'gte', 'lte', 'order', 'range', 'or']) {
        query[method] = (...args: unknown[]) => { mock.calls.push([table, method, args]); return query }
      }
      query.maybeSingle = async () => ({ data: table === 'usuarios' ? { id: 'user', rol: mock.admin ? 'admin' : 'stratix360', activo: true } : mock.projectAccessible ? { id: 'project' } : null })
      query.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve)
      return query
    },
  }),
}))
import { GET } from './route'

const url = (params: string) => new NextRequest(`http://localhost/api/tasks/calendar?${params}`)
beforeEach(() => { mock.admin = false; mock.projectAccessible = true; mock.calls = []; mock.tables = [] })

describe('calendar API', () => {
  it('rejects dates outside a visible period', async () => {
    expect((await GET(url('start=2026-10-01&end=2027-01-01'))).status).toBe(400)
    expect(mock.tables).toEqual([])
  })
  it('does not expose the member filter to workers', async () => {
    const response = await GET(url('start=2026-10-01&end=2026-10-31&member=123e4567-e89b-42d3-a456-426614174000'))
    expect(response.status).toBe(403)
    expect(mock.tables).not.toContain('actividades')
  })
  it('queries only the requested DATE range and applies filters server side', async () => {
    mock.admin = true
    const response = await GET(url('start=2026-10-01&end=2026-10-31&company=EMC&status=Pendiente'))
    expect(response.status).toBe(200)
    expect(mock.calls).toContainEqual(['actividades', 'gte', ['fecha_entrega', '2026-10-01']])
    expect(mock.calls).toContainEqual(['actividades', 'lte', ['fecha_entrega', '2026-10-31']])
    expect(mock.calls).toContainEqual(['actividades', 'eq', ['empresa', 'EMC']])
    expect(mock.calls).toContainEqual(['actividades', 'eq', ['estado', 'Pendiente']])
    expect(mock.calls).toContainEqual(['actividades', 'range', [0, 499]])
    expect(mock.calls.find(([table, method]) => table === 'actividades' && method === 'select')?.[2]).toEqual([expect.stringContaining('actividad_responsables!')])
    expect(mock.calls.find(([table, method]) => table === 'actividades' && method === 'select')?.[2]).not.toEqual([expect.stringContaining('responsable_id')])
  })
  it('filters an admin-selected member through the join table', async () => {
    mock.admin = true
    const member = '123e4567-e89b-42d3-a456-426614174000'
    const response = await GET(url(`start=2026-10-01&end=2026-10-31&member=${member}`))
    expect(response.status).toBe(200)
    expect(mock.calls).toContainEqual(['actividades', 'eq', ['matched.usuario_id', member]])
  })
  it('does not query tasks for a project hidden by RLS', async () => {
    mock.projectAccessible = false
    const response = await GET(url('start=2026-10-01&end=2026-10-31&project=123e4567-e89b-42d3-a456-426614174000'))
    expect(response.status).toBe(404)
    expect(mock.tables).not.toContain('actividades')
  })
})
