import type { z } from 'zod'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import { MISSING_WEEKDAY_MESSAGE } from '@/app/api/tasks/availability/constants'
import saveSchema from '../schema'

export default function normalizeRange({
  weekday,
  startsAt,
  endsAt,
  note,
}: z.infer<typeof saveSchema>['ranges'][number]): WeeklyAvailabilityRange {
  if (weekday === undefined) throw new Error(MISSING_WEEKDAY_MESSAGE)
  const normalizedRange = {
    weekday,
    startsAt,
    endsAt,
    note,
  }

  return normalizedRange
}

// `parsed.data.ranges[number]` infers `weekday` optional under zod v4 + this repo's
// `strictNullChecks: false` (schema.ts never marks it so); narrows it back at the point of use.
