import type { MeetingOverview } from '@/app/api/integrations/meet/_shared/contracts'

export type OverviewTask = { id: string; titulo: string; estado: string | null; responsable: string | null }

export function overviewModel(summary: MeetingOverview) {
  const tasks = new Map(summary.tasks.map(task => [task.id, task]))
  // The existing overview excludes meeting-status activities from generated Tasks.
  const statusIds = new Set(summary.links.filter(link => link.section === 'meeting_activity').map(link => link.actividad_id))
  const byMeeting: Record<string, OverviewTask[]> = {}
  const statusByMeeting: Record<string, OverviewTask | null> = {}
  const seen = new Map<string, Set<string>>()
  for (const link of summary.links) {
    const source = link.actividad_id ? tasks.get(link.actividad_id) : null
    const task = source ? { id: source.id, titulo: source.titulo, estado: source.estado, responsable: source.responsable?.nombre ?? null } : null
    if (link.section === 'meeting_activity') { statusByMeeting[link.meeting_id] = task; continue }
    if (!task || statusIds.has(task.id)) continue
    const meetingIds = seen.get(link.meeting_id) ?? new Set<string>()
    seen.set(link.meeting_id, meetingIds)
    if (meetingIds.has(task.id)) continue
    meetingIds.add(task.id)
    ;(byMeeting[link.meeting_id] ??= []).push(task)
  }
  for (const rows of Object.values(byMeeting)) rows.sort((a, b) => a.id.localeCompare(b.id))
  return { byMeeting, statusByMeeting }
}
