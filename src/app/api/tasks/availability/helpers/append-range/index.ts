import type { AvailabilityMemberDto, AvailabilityRangeDto } from '@/features/tasks/data/availability/types'
import type { AvailabilityRow } from '@/app/api/tasks/availability/types'

const TIME_SLICE_LENGTH = 5

function toCanonicalTime(value: string): string {
  return value.slice(0, TIME_SLICE_LENGTH)
}

/** Appends `row`'s range to `member` when the row carries one — a member-only row (no ranges
 *  yet) has every range field `null` together, so one check covers the whole group. */
export default function appendRange(
  member: AvailabilityMemberDto,
  {
    range_id: rangeId,
    weekday,
    starts_at: startsAt,
    ends_at: endsAt,
    note,
  }: AvailabilityRow,
): void {
  const hasRange = rangeId !== null && weekday !== null && startsAt !== null && endsAt !== null

  if (!hasRange) return

  const range: AvailabilityRangeDto = {
    id: rangeId,
    weekday,
    startsAt: toCanonicalTime(startsAt),
    endsAt: toCanonicalTime(endsAt),
    note,
  }

  member.ranges.push(range)
}

// Omits member-only rows and canonicalizes stored time strings when appending a complete range.
