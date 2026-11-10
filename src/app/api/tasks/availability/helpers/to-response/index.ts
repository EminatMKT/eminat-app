import type { AvailabilityMemberDto, AvailabilityResponse } from '@/features/tasks/data/availability/types'
import type { AvailabilityRow } from '@/app/api/tasks/availability/types'
import buildMember from '../build-member'
import appendRange from '../append-range'

/** Groups the flat rows `get_visible_weekly_availability()` returns into one entry per member,
 *  ordered ranges included, `canEdit` true only for the viewer's own row. */
export default function toAvailabilityResponse(
  rows: AvailabilityRow[],
  viewerUserId: string,
): AvailabilityResponse {
  const memberMap = new Map<string, AvailabilityMemberDto>()

  rows.forEach((row) => {
    const existingMember = memberMap.get(row.user_id)
    const member = existingMember ?? buildMember(row, viewerUserId)

    if (!existingMember) memberMap.set(row.user_id, member)
    appendRange(member, row)
  })
  const members = Array.from(memberMap.values())

  return { viewerUserId, members }
}

// Groups RPC rows in encounter order without dropping members who have no saved ranges.
