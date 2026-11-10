import type { I18nKey } from '@/shared/i18n'

/** Day of the week a range belongs to. 1 is Monday, 7 is Sunday — ISO-8601, not JS's
 *  `Date#getDay`. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** One block of recurring weekly availability: the same weekday, every week, from `startsAt` to
 *  `endsAt` (canonical `HH:mm`). `note` is free text a person can attach — it never feeds the
 *  hour math, only the calendar prints it. */
export type WeeklyAvailabilityRange = {
  id?: string
  weekday: Weekday
  startsAt: string
  endsAt: string
  note?: string | null
}

/** Every `validateRanges` error points back at the range that triggered it. The three variants
 *  below derive from this instead of each repeating the field. */
type RangeIndexedError = {
  rangeIndex: number
}

/** `startsAt` or `endsAt` doesn't parse as a canonical `HH:mm` value. */
export type InvalidTimeError = RangeIndexedError & { code: 'invalid-time' }

/** `endsAt` is not strictly after `startsAt` — covers both zero-duration and reversed ranges. */
export type EndNotAfterStartError = RangeIndexedError & { code: 'end-not-after-start' }

/** Two ranges on the same weekday share minutes. Touching ranges (one ends exactly when the
 *  other starts) do not count as an overlap. `rangeIndex` is the later range in input order,
 *  `conflictingRangeIndex` the earlier one it collides with. */
export type OverlapError = RangeIndexedError & {
  code: 'overlap'
  conflictingRangeIndex: number
}

/** Every way `validateRanges` can reject a set of ranges, keyed by `code`. */
export type RangeValidationError = InvalidTimeError | EndNotAfterStartError | OverlapError

/** One column of the weekly calendar: the weekday and the i18n key its header prints. */
export type AvailabilityDay = {
  weekday: Weekday
  labelKey: I18nKey
}

/** Where a day's declared hours land against the jornada reference for that day. */
export type DailyHoursStatus = 'below' | 'complete' | 'above' | 'unavailable'

/** Result of comparing one day's declared hours against its expected (jornada) hours.
 *  `expectedHours: null` means the day has no jornada reference at all — not a shortfall. */
export type DailyHoursComparison = {
  declaredHours: number
  expectedHours: number | null
  differenceHours: number | null
  status: DailyHoursStatus
}
