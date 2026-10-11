import type {
  DepartmentRecord,
  Profile,
  TaskAssignee,
  TaskOrganization,
  TeamRecord,
} from '@/features/meet/lib/types'

export type RoleModuleRow = { role_key: string; module_slug: string }
export const NO_ORGANIZATION = '__none__'

const LEGACY_ROLES: Record<string, string> = {
  superadmin: 'admin',
  coordinador: 'admin',
  colaborador: 'stratix360',
  pasante: 'stratix360',
}

export function normalizedRole(role?: string | null): string | null {
  if (!role) return null
  return LEGACY_ROLES[role] ?? role
}

export function canBeTaskAssignee(
  profile: Profile,
  roleModules: RoleModuleRow[]
): boolean {
  if (profile.activo !== true) return false
  const role = normalizedRole(profile.rol)
  if (!role) return false
  if (role === 'admin') return true
  return roleModules.some(
    (row) => row.role_key === role && row.module_slug === 'tasks'
  )
}

export function buildTaskOrganization(
  profiles: Profile[],
  departments: DepartmentRecord[],
  teams: TeamRecord[],
  roleModules: RoleModuleRow[]
): TaskOrganization {
  const departmentsById = new Map(departments.map((item) => [item.id, item]))
  const teamsById = new Map(teams.map((item) => [item.id, item]))
  const assignees: TaskAssignee[] = profiles
    .filter((profile) => canBeTaskAssignee(profile, roleModules))
    .map((profile) => {
      const team = profile.equipo_id
        ? teamsById.get(profile.equipo_id) ?? null
        : null
      return {
        ...profile,
        activo: true,
        equipo_id: profile.equipo_id ?? null,
        equipo: team,
        departamento: team
          ? departmentsById.get(team.departamento_id) ?? null
          : null,
      }
    })
  return { companies: [], departments, teams, users: profiles, assignees }
}

export function filterTeamsByDepartment(
  teams: TeamRecord[],
  departmentId: string
): TeamRecord[] {
  return teams.filter(
    (team) =>
      team.activo &&
      departmentId !== NO_ORGANIZATION &&
      (!departmentId || team.departamento_id === departmentId)
  )
}

export function filterAssigneesByTeam(
  assignees: TaskAssignee[],
  teamId: string
): TaskAssignee[] {
  return assignees.filter(
    (assignee) =>
      !teamId ||
      (teamId === NO_ORGANIZATION
        ? !assignee.equipo_id
        : assignee.equipo_id === teamId)
  )
}

export function activityOrganizationPayload(responsableId: string) {
  return { responsable_id: responsableId }
}

export function isHistoricalAssignee(
  currentId: string,
  assignees: TaskAssignee[]
): boolean {
  return Boolean(currentId && !assignees.some((item) => item.id === currentId))
}
