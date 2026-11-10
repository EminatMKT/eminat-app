import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import type { AvailabilityRow } from '@/app/api/tasks/availability/types'

/** Builds a new member entry for `row`'s owner — one call per first-seen `user_id`, `canEdit`
 *  true only when the row belongs to the viewer. */
export default function buildMember(
  {
    user_id: userId,
    first_name: firstName,
    last_name: lastName,
    team_id: teamId,
    team_name: teamName,
    workday_id: workdayId,
    workday_name: workdayName,
    hours_per_week: hoursPerWeek,
  }: AvailabilityRow,
  viewerUserId: string,
): AvailabilityMemberDto {
  const hasTeam = teamId !== null && teamName !== null
  const team = hasTeam ? { id: teamId, name: teamName } : null
  const hasWorkday = workdayId !== null && workdayName !== null && hoursPerWeek !== null
  const workday = hasWorkday ? { id: workdayId, name: workdayName, hoursPerWeek } : null
  const member: AvailabilityMemberDto = {
    id: userId,
    name: `${firstName} ${lastName}`.trim(),
    team,
    workday,
    ranges: [],
    canEdit: userId === viewerUserId,
  }

  return member
}

// Preserves absent team/workday joins while marking only the viewer's member entry as editable.
