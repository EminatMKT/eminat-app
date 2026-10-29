/** Canonical `HH:mm`, 24-hour clock: `00:00` through `23:59`. */
export const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/

/** Separates hours from minutes in a canonical `HH:mm` value. */
export const TIME_SEPARATOR = ':'

/** Converts between minutes-since-midnight and hours. */
export const MINUTES_PER_HOUR = 60

/** Hour figure printed when a day has no jornada reference to compare against. */
export const NO_HOURS = 0
