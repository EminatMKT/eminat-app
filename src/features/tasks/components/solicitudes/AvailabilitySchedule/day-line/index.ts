import {
  compareDailyHours,
  comparisonCopyVars,
  declaredHoursByDay,
} from '@/features/tasks/utils/availability'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import {
  STATUS_COPY_KEYS,
  STATUS_SYMBOLS,
} from '@/features/tasks/components/solicitudes/MemberAvailabilityCard/constants'
import type { BuildDayLineInput } from './types'

const RANGE_JOIN_SEPARATOR = ', '

function rangeText({ startsAt, endsAt, note }: WeeklyAvailabilityRange): string {
  const noteText = note ? ` (${note})` : ''
  const text = `${startsAt}–${endsAt}${noteText}`

  return text
}

/** One weekday's display line: its label, its ranges rendered as one string, and how its
 *  declared hours compare to the member's jornada — everything `AvailabilitySchedule` needs to
 *  hand a day to the shared `ListaRotulada`/`HoursStatus` pair without drawing markup itself. */
export default function buildDayLine(input: BuildDayLineInput) {
  const {
    day,
    ranges,
    hoursPerDay,
    t,
  } = input
  const dayRanges = ranges.filter(range => range.weekday === day.weekday)
  const hoursByDay = declaredHoursByDay(ranges)
  const declared = hoursByDay[day.weekday] ?? 0
  const comparison = compareDailyHours(declared, hoursPerDay)
  const dayLabelVars = { day: t(day.labelKey) }
  const label = t('tasks.availability.dayLabel', dayLabelVars)
  const rangesText = dayRanges.length === 0
    ? t('tasks.availability.emptyDay')
    : dayRanges.map(rangeText).join(RANGE_JOIN_SEPARATOR)
  const statusText = t(STATUS_COPY_KEYS[comparison.status], comparisonCopyVars(comparison))
  const line = {
    label,
    rangesText,
    statusSymbol: STATUS_SYMBOLS[comparison.status],
    statusTone: comparison.status,
    statusText,
  }

  return line
}

// Pulls the per-day comparison math and text assembly out of AvailabilitySchedule, so that
// component only ever composes shared UI and never draws a range row by hand.
