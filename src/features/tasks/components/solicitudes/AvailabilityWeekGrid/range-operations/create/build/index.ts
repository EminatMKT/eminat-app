import { hhmmOf } from '@/features/tasks/utils/availability'
import { EDITOR_COPY }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import type { BuildRangeInput } from './types'

/** Builds a new draft without changing or validating the containing week. */
export default function buildRange({ day, bounds }: BuildRangeInput) {
  const clientId = `${EDITOR_COPY.draftPrefix}-${crypto.randomUUID()}`
  const identity = { clientId, weekday: day.weekday, note: EDITOR_COPY.emptyNote }
  const times = { startsAt: hhmmOf(bounds.start), endsAt: hhmmOf(bounds.end) }
  const range = { ...identity, ...times }

  return range
}

// Draft identity and canonical time formatting stay independent of committing a week.
