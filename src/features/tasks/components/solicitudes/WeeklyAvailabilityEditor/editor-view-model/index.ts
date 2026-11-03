import { AVAILABILITY_DAYS, declaredWeeklyHours } from '@/features/tasks/utils/availability'
import type { AvailabilityDay, Weekday } from '@/features/tasks/utils/availability'
import type { EditableRange } from '../component-types'
import projectDayErrors from '../project-day-errors'
import type { EditorViewModel, EditorViewModelDay, EditorViewModelInput } from './types'

const createDayViewModel = (
  day: AvailabilityDay,
  source: EditorViewModelInput,
  expectedHours: number | null,
): EditorViewModelDay => {
  const { ranges, errors } = source
  const weekday: Weekday = day.weekday
  const dayEntries = ranges
    .map((range, rangeIndex) => ({ range, rangeIndex }))
    .filter(entry => entry.range.weekday === weekday)
  const dayRanges = dayEntries.map(entry => entry.range)
  const dayErrors = dayEntries.flatMap((entry, localIndex) =>
    projectDayErrors({ errors, rangeIndex: entry.rangeIndex }).map(error => ({
      ...error,
      rangeIndex: localIndex,
    })),
  )
  const viewModel: EditorViewModelDay = {
    day,
    ranges: dayRanges,
    errors: dayErrors,
    expectedHours,
  }
  return viewModel
}

export default function buildWeeklyAvailabilityEditorViewModel(source: EditorViewModelInput): EditorViewModel {
  const { ranges, workday } = source
  const expectedHours = workday?.hoursPerDay ?? null
  const dayModels = AVAILABILITY_DAYS.map(day => createDayViewModel(day, source, expectedHours))
  const [monday, tuesday, wednesday, thursday, friday, saturday, sunday] = dayModels
  const weeklySummary = { declaredHours: declaredWeeklyHours(ranges) }
  const viewModel: EditorViewModel = {
    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
    saturday,
    sunday,
    weeklySummary,
  }
  return viewModel
}

// This pure helper projects editor state into the named day and weekly-summary view data.
