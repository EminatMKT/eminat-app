import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { listMeetingOverview } from './meeting-overview-service'

type Row = Record<string, unknown>
type Read = { table: string; select: string; ids?: string[]; equals: Record<string, unknown>; range?: number[] }
function fixture(tables: Record<string, Row[]>, denied?: string) {
  const reads: Read[] = []
  const from = (table: string) => {
    const read: Read = { table, select: '', equals: {} }
    const query = {
      select(value: string) { read.select = value; return query },
      eq(column: string, value: unknown) { read.equals[column] = value; return query },
      in(column: string, values: string[]) { expect(column).toBe('id'); read.ids = values; return query },
      order() { return query },
      range(start: number, end: number) { read.range = [start, end]; return query },
      maybeSingle() { return execute(true) },
      then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) { return execute(false).then(resolve, reject) },
    }
    async function execute(single: boolean) {
      reads.push(read)
      if (table === denied) return { data: null, error: { message: 'RLS read denied' } }
      let rows = (tables[table] ?? []).filter(row => Object.entries(read.equals).every(([key, value]) => row[key] === value))
      if (read.ids) rows = rows.filter(row => read.ids!.includes(String(row.id)))
      rows = [...rows].sort((a, b) => String(a.id ?? a.actividad_id).localeCompare(String(b.id ?? b.actividad_id)))
      if (read.range) rows = rows.slice(read.range[0], read.range[1] + 1)
      return { data: single ? rows[0] ?? null : rows, error: null }
    }
    return query
  }
  return { client: { from } as unknown as SupabaseClient, reads }
}
const profile = { id: 'viewer', equipos: { id: 'team', nombre: 'Team' }, empresas: { id: 'co', nombre: 'Company' } }
const link = (id: string, activity: string | null = id, meeting = 'm1', section = 'action') => ({ id, actividad_id: activity, meeting_id: meeting, section, meetings: { id: meeting } })
const task = (id: string) => ({ id, titulo: `Task ${id}`, estado: 'Pendiente', actividad_responsables: [] })

describe('overview scoped retrieval', () => {
  it('reads every authorized link and task beyond page boundaries, never an unfiltered activity page', async () => {
    const ids = Array.from({ length: 251 }, (_, i) => String(i).padStart(4, '0'))
    const { client, reads } = fixture({ usuarios: [profile], topics: ids.map(id => link(id)), actividades: [...ids.map(task), task('unrelated')] })
    const result = await listMeetingOverview(client, 'viewer')
    expect(result.ok).toBe(true)
    expect(result.data?.tasks).toHaveLength(251)
    expect(result.data?.links).toHaveLength(251)
    expect(reads.filter(read => read.table === 'topics')).toHaveLength(3)
    const activities = reads.filter(read => read.table === 'actividades')
    expect(activities).toHaveLength(3)
    expect(activities.every(read => read.ids && read.ids.length <= 100 && !read.range)).toBe(true)
    expect(activities.map(read => read.ids).flat()).not.toContain('unrelated')
    expect(result.data?.tasks[0]).not.toHaveProperty('descripcion')
  })
  it('does not authorize a hidden or mismatched meeting through a topic and retains unavailable status links', async () => {
    const { client, reads } = fixture({ usuarios: [profile], topics: [link('a'), { ...link('b'), meetings: null }, { ...link('c'), meetings: { id: 'other' } }, link('d', null, 'm1', 'meeting_activity'), link('e', 'hidden-task')], actividades: [task('a')] })
    const result = await listMeetingOverview(client, 'viewer')
    expect(result.data?.links.map(row => row.topic_id)).toEqual(['a', 'd', 'e'])
    expect(result.data?.tasks.map(row => row.id)).toEqual(['a'])
    expect(reads.find(read => read.table === 'actividades')?.ids).toEqual(['a', 'hidden-task'])
  })
  it('returns failure instead of a partial success with false zero counts', async () => {
    const { client } = fixture({ usuarios: [profile], topics: [link('a')] }, 'actividades')
    expect(await listMeetingOverview(client, 'viewer')).toMatchObject({ ok: false, message: 'RLS read denied' })
  })
  it('never queries activities when no accessible topic/task or own assignment exists', async () => {
    const { client, reads } = fixture({ usuarios: [profile], topics: [] })
    expect((await listMeetingOverview(client, 'viewer')).data).toMatchObject({ tasks: [], links: [], header: { team: 'Team', department: null, company: 'Company' } })
    expect(reads.some(read => read.table === 'actividades')).toBe(false)
  })
  it('preserves first canonical-own-task header fallback, not first membership or first meeting task', async () => {
    const own = { id: 'viewer', nombre_display: 'Zoe', equipos: { id: 't', nombre: 'Own team', departamentos: { nombre: 'Own department' } } }
    const other = { id: 'other', nombre_display: 'Ana' }
    const assignment = (user: typeof own | typeof other, leader = false) => ({ usuario_id: user.id, es_lider: leader, usuarios: user })
    const { client, reads } = fixture({ usuarios: [{ ...profile, equipos: null, empresas: null }], topics: [], actividad_responsables: [{ usuario_id: 'viewer', actividad_id: 'a' }, { usuario_id: 'viewer', actividad_id: 'b' }], actividades: [{ ...task('a'), empresa: 'Wrong', actividad_responsables: [assignment(own), assignment(other, true)] }, { ...task('b'), empresa: 'Fallback', actividad_responsables: [assignment(own, true), assignment(other)] }] })
    expect((await listMeetingOverview(client, 'viewer')).data?.header).toEqual({ team: 'Own team', department: 'Own department', company: 'Fallback' })
    expect(reads.find(read => read.table === 'actividad_responsables')?.equals).toEqual({ usuario_id: 'viewer' })
    expect(reads.find(read => read.table === 'actividades')?.ids).toEqual(['a', 'b'])
  })
})
