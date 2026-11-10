import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'

/** The member without a jornada whose declared week total is shown on its own. */
export type DeclaredTotalProps = {
  member: AvailabilityMemberDto
}
