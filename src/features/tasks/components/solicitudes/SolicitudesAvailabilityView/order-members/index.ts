import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'

/** Puts the viewer's own row first — `AvailabilityMemberDto.canEdit` is true only for it — and
 *  keeps every other member in their existing relative order. A missing own row leaves the list
 *  unchanged, since that just means the viewer does not appear among the members shown. */
export default function orderMembers(members: AvailabilityMemberDto[]): AvailabilityMemberDto[] {
  const own = members.filter(member => member.canEdit)
  const rest = members.filter(member => !member.canEdit)

  return [...own, ...rest]
}

// orderMembers hoists the viewer's own card to the front of the availability grid, so it is
// always the first one a person sees regardless of where the API placed it.
