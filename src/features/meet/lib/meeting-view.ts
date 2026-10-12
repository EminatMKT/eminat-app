import type { CanonicalTaskListItem, Meeting } from './types'

export function splitMeetingHistory<T extends Pick<Meeting, 'status'>>(meetings: T[]) {
  return {
    active: meetings.filter((meeting) => meeting.status === 'activa'),
    finished: meetings.filter((meeting) => meeting.status === 'finalizada'),
  }
}

export type TaskScope = 'related' | 'all' | 'mine' | 'team' | 'company'

export function visibleMeetTasks(
  tasks: CanonicalTaskListItem[],
  scope: TaskScope,
  viewer: { profileId: string | null; teamId: string | null; company: string | null },
  assigneeId: string,
  status = 'all',
) {
  return tasks.filter((task) => {
    if (status !== 'all' && task.estado !== status) return false
    if (scope === 'related') return task.related_to_viewer
    if (scope === 'mine') return task.responsable_id === viewer.profileId
    if (scope === 'team') return Boolean(viewer.teamId) && task.equipo?.id === viewer.teamId
    if (scope === 'company') return Boolean(viewer.company) && task.empresa === viewer.company
    return !assigneeId || task.responsable_id === assigneeId
  })
}
