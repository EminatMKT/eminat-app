export type TeamMembership = { project_id: string; user_id: string; project_role: string }
export type TeamWorkload = { user_id: string; pending_count: number; in_progress_count: number }

export function visiblePeopleIds(admin: boolean, assignableIds: string[], selfId: string | undefined, memberships: TeamMembership[], accessEnforced = false): Set<string> {
  if (admin) return new Set([...assignableIds, ...memberships.map(m => m.user_id)])
  if (accessEnforced) return new Set([...assignableIds, selfId, ...memberships.map(m => m.user_id)].filter((id): id is string => Boolean(id)))
  return new Set([selfId, ...memberships.map(m => m.user_id)].filter((id): id is string => Boolean(id)))
}

export function taskProjectScope(admin: boolean, selfId: string | undefined, selectedId: string, memberships: TeamMembership[], accessEnforced = false): string[] | null {
  if (admin || selectedId === selfId || accessEnforced) return null
  return memberships.filter(m => m.user_id === selectedId).map(m => m.project_id)
}

export function visibleWorkload(admin: boolean, userId: string, workload: TeamWorkload[]): TeamWorkload | null {
  return admin ? workload.find(w => w.user_id === userId) || { user_id: userId, pending_count: 0, in_progress_count: 0 } : null
}
