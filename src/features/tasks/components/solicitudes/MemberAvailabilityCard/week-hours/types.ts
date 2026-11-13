import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'

/** The member whose declared week is compared against their jornada's weekly hours. */
export type WeekHoursProps = {
  member: AvailabilityMemberDto
}
