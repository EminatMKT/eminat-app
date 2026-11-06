import type { SupabaseClient } from '@supabase/supabase-js'
import type { MeetingOverview } from './contracts'
import type { ServiceResult } from './task-service'
import MEET_ERRORS from './errors'
import projections from './projections'
import canonicalResponsibles from './responsibles'
import type { MeetResponsibleRow } from './responsibles/types'

const PAGE_SIZE = 100
const first = <T>(value: T | T[] | null | undefined): T | null => Array.isArray(value) ? value[0] ?? null : value ?? null
type LinkRow = { id: string; meeting_id: string; actividad_id: string | null; section: string | null; meetings: { id: string } | { id: string }[] | null }
type SummaryRow = { id: string; titulo: string; estado: string; actividad_responsables: MeetResponsibleRow[] | null }

/** Same header fallbacks as the full list's first canonical task owned by this viewer.
 * Only that viewer's RLS-visible assignment candidates are read, stopping at the first match.
 */
async function overviewHeader(client: SupabaseClient, profileId: string): Promise<MeetingOverview['header']> {
  const profileResult = await client.from('usuarios').select(projections.viewerProfile).eq('id', profileId).maybeSingle()
  if (profileResult.error || !profileResult.data) throw new Error(profileResult.error?.message ?? 'Viewer unavailable')
  const profile = profileResult.data
  const header: MeetingOverview['header'] = { team: first(profile.equipos)?.nombre ?? null, department: null, company: first(profile.empresas)?.nombre ?? null }
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const assignments = await client.from('actividad_responsables').select('actividad_id')
      .eq('usuario_id', profileId).order('actividad_id', { ascending: true }).range(offset, offset + PAGE_SIZE - 1)
    if (assignments.error) throw new Error(assignments.error.message)
    const ids = (assignments.data ?? []).map(row => row.actividad_id as string)
    if (ids.length) {
      const result = await client.from('actividades').select(projections.overviewHeaderTask).in('id', ids).order('id', { ascending: true })
      if (result.error) throw new Error(result.error.message)
      for (const row of result.data ?? []) {
        const responsible = canonicalResponsibles(row.actividad_responsables as unknown as MeetResponsibleRow[])
        if (responsible.responsable_id !== profileId) continue
        const team = first(responsible.principal?.equipos)
        return { team: header.team ?? team?.nombre ?? null, department: first(team?.departamentos)?.nombre ?? null, company: header.company ?? row.empresa }
      }
    }
    if (ids.length < PAGE_SIZE) return header
  }
}

/** Actor-scoped read only. No supplied IDs authorize access, and no global Tasks scan.
 * The default list predicate explicitly includes visibleMeetingActivities. These links
 * establish that same branch, with BOTH topic and meeting RLS enforced by the inner embed;
 * activities and responsible embeds are then read through the same authenticated client.
 */
export async function listMeetingOverview(client: SupabaseClient, profileId: string): Promise<ServiceResult<MeetingOverview>> {
  try {
    const headerPromise = overviewHeader(client, profileId)
    // Attach a rejection handler immediately while the independent link reads run.
    const headerResult = headerPromise.then(data => ({ data, error: null }), error => ({ data: null, error }))
    const links: MeetingOverview['links'] = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const result = await client.from('topics').select(projections.overviewLinks)
        .order('id', { ascending: true }).range(offset, offset + PAGE_SIZE - 1)
      if (result.error) throw new Error(result.error.message)
      const rows = (result.data ?? []) as unknown as LinkRow[]
      for (const row of rows) {
        if (first(row.meetings)?.id !== row.meeting_id || (!row.actividad_id && row.section !== 'meeting_activity')) continue
        links.push({ topic_id: row.id, meeting_id: row.meeting_id, actividad_id: row.actividad_id, section: row.section })
      }
      if (rows.length < PAGE_SIZE) break
    }
    const ids = Array.from(new Set(links.map(link => link.actividad_id).filter((id): id is string => Boolean(id)))).sort()
    const tasks: MeetingOverview['tasks'] = []
    for (let offset = 0; offset < ids.length; offset += PAGE_SIZE) {
      const result = await client.from('actividades').select(projections.overviewTask).in('id', ids.slice(offset, offset + PAGE_SIZE))
        .order('id', { ascending: true })
      if (result.error) throw new Error(result.error.message)
      for (const row of (result.data ?? []) as unknown as SummaryRow[]) {
        // Retain the canonical leader/name ordering, including hidden historical profiles.
        tasks.push({ id: row.id, titulo: row.titulo, estado: row.estado, responsable: canonicalResponsibles(row.actividad_responsables).responsable })
      }
    }
    const header = await headerResult
    if (header.error || !header.data) throw header.error ?? new Error('Viewer unavailable')
    return { ok: true, data: { tasks, links, header: header.data } }
  } catch (error) {
    return { ok: false, ...MEET_ERRORS.taskListForbidden, message: error instanceof Error ? error.message : 'Overview unavailable' }
  }
}
