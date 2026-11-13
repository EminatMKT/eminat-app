import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'

/** The member whose week badge and editable/read-only icon the card's right side shows. */
export type CardStatusProps = {
  member: AvailabilityMemberDto
}
