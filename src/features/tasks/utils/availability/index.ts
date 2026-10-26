export type {
  DailyHoursComparison,
  DailyHoursStatus,
  RangeValidationError,
  Weekday,
  WeeklyAvailabilityRange,
} from './types'
export { default as durationHours } from './duration-hours'
export { default as sortRanges } from './sort-ranges'
export { default as validateRanges } from './validate-ranges'
export { default as declaredHoursByDay } from './declared-hours-by-day'
export { default as declaredWeeklyHours } from './declared-weekly-hours'
export { default as compareDailyHours } from './compare-daily-hours'

// Barrel for the recurring weekly availability domain: each function lives in its own file
// (one per file, `export default`), this index only re-exports them.
