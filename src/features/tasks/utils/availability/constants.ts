import type { AvailabilityDay, DailyHoursStatus } from './types'

/** Canonical `HH:mm`, 24-hour clock: `00:00` through `23:59`. */
export const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/

/** Only an availability range end can use this next-day midnight value. */
export const END_OF_DAY_TIME = '24:00'

/** The first `HH:mm` past `END_OF_DAY_TIME`: no range may end there. */
export const PAST_END_OF_DAY_TIME = '24:01'

/** Minutes since midnight at the exclusive end of a day. */
export const MINUTES_PER_DAY = 1440

/** Separates hours from minutes in a canonical `HH:mm` value. */
export const TIME_SEPARATOR = ':'

/** Converts between minutes-since-midnight and hours. */
export const MINUTES_PER_HOUR = 60

/** Hour figure printed when a day has no jornada reference to compare against. */
export const NO_HOURS = 0

/** Width `hhmmOf` pads each hour/minute figure to. */
export const PAD_LENGTH = 2

/** Character `hhmmOf` pads a single-digit hour or minute with. */
export const PAD_CHAR = '0'

/** The seven calendar columns, Monday first, each with the key of its header label. */
export const AVAILABILITY_DAYS: AvailabilityDay[] = [
  { weekday: 1, labelKey: 'tasks.availability.monday' },
  { weekday: 2, labelKey: 'tasks.availability.tuesday' },
  { weekday: 3, labelKey: 'tasks.availability.wednesday' },
  { weekday: 4, labelKey: 'tasks.availability.thursday' },
  { weekday: 5, labelKey: 'tasks.availability.friday' },
  { weekday: 6, labelKey: 'tasks.availability.saturday' },
  { weekday: 7, labelKey: 'tasks.availability.sunday' },
]

/** Glyph printed next to each daily-hours status. */
export const STATUS_SYMBOLS: Record<DailyHoursStatus, string> = {
  below: '↓',
  complete: '✓',
  above: '↑',
  unavailable: '—',
}
