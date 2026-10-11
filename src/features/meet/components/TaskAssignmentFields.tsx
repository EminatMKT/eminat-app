'use client'

import { useMemo } from 'react'
import {
  filterAssigneesByTeam,
  filterTeamsByDepartment,
  isHistoricalAssignee,
  NO_ORGANIZATION,
} from '@/features/meet/lib/task-organization'
import { usuarioNombre, type Profile, type TaskOrganization } from '@/features/meet/lib/types'
import { usePreferences } from '@/features/meet/lib/preferences'

type Props = {
  organization: TaskOrganization
  departmentId: string
  teamId: string
  assigneeId: string
  currentAssignee?: Profile | null
  onDepartmentChange: (id: string) => void
  onTeamChange: (id: string) => void
  onAssigneeChange: (id: string) => void
  disabled?: boolean
}

const fieldClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-gray-100'

export function TaskAssignmentFields({
  organization,
  departmentId,
  teamId,
  assigneeId,
  currentAssignee = null,
  onDepartmentChange,
  onTeamChange,
  onAssigneeChange,
  disabled = false,
}: Props) {
  const { locale } = usePreferences()
  const copy = locale === 'es'
    ? { department: 'Departamento', team: 'Equipo', assignee: 'Responsable', noOrganization: 'Sin departamento/equipo', noTeam: 'Sin equipo', noDepartment: 'Sin departamento', currentTeam: 'Equipo actual (no elegible)', currentAssignee: 'Responsable actual (no elegible)' }
    : { department: 'Department', team: 'Team', assignee: 'Assignee', noOrganization: 'No department/team', noTeam: 'No team', noDepartment: 'No department', currentTeam: 'Current team (not eligible)', currentAssignee: 'Current assignee (not eligible)' }
  const teams = useMemo(
    () => filterTeamsByDepartment(organization.teams, departmentId),
    [organization.teams, departmentId]
  )
  const assignees = useMemo(
    () => filterAssigneesByTeam(organization.assignees, teamId),
    [organization.assignees, teamId]
  )
  const selected = organization.assignees.find((item) => item.id === assigneeId)
  const historicalCurrent =
    currentAssignee &&
    currentAssignee.id === assigneeId &&
    isHistoricalAssignee(currentAssignee.id, organization.assignees)
      ? currentAssignee
      : null
  const historicalTeam = historicalCurrent?.equipo_id
    ? organization.teams.find((team) => team.id === historicalCurrent.equipo_id)
    : null
  const teamIsOutsideEligibleOptions = Boolean(
    historicalTeam && !teams.some((team) => team.id === historicalTeam.id)
  )

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <select
          aria-label={copy.department}
          value={departmentId}
          disabled={disabled}
          onChange={(event) => {
            onDepartmentChange(event.target.value)
            onTeamChange('')
            onAssigneeChange('')
          }}
          className={fieldClass}
        >
          <option value="">{copy.department}…</option>
          {organization.departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.nombre}
            </option>
          ))}
          <option value={NO_ORGANIZATION}>{copy.noOrganization}</option>
        </select>
        <select
          aria-label={copy.team}
          value={teamId}
          disabled={disabled || !departmentId}
          onChange={(event) => {
            onTeamChange(event.target.value)
            onAssigneeChange('')
          }}
          className={fieldClass}
        >
          <option value="">{copy.team}…</option>
          {teamIsOutsideEligibleOptions && historicalTeam && (
            <option value={historicalTeam.id} disabled>
              {historicalTeam.nombre} — {copy.currentTeam}
            </option>
          )}
          {departmentId === NO_ORGANIZATION && (
            <option value={NO_ORGANIZATION}>{copy.noTeam}</option>
          )}
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.nombre}
            </option>
          ))}
        </select>
        <select
          aria-label={copy.assignee}
          value={assigneeId}
          disabled={disabled || !teamId}
          onChange={(event) => onAssigneeChange(event.target.value)}
          className={fieldClass}
        >
          <option value="">{copy.assignee}…</option>
          {historicalCurrent && (
            <option value={historicalCurrent.id} disabled>
              {usuarioNombre(historicalCurrent)} — {copy.currentAssignee}
            </option>
          )}
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {usuarioNombre(assignee)}
            </option>
          ))}
        </select>
      </div>
      {historicalCurrent ? (
        <p className="text-xs font-medium text-amber-700">
          {usuarioNombre(historicalCurrent)} — {copy.currentAssignee}
        </p>
      ) : selected ? (
        <p className="text-xs text-gray-500">
          {usuarioNombre(selected)} · {selected.equipo?.nombre ?? copy.noTeam} ·{' '}
          {selected.departamento?.nombre ?? copy.noDepartment}
        </p>
      ) : null}
    </div>
  )
}
