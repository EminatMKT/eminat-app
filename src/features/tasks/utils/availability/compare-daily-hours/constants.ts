import type { DailyHoursStatus } from '../types'

/** Declared hours fall short of the jornada reference. */
export const BELOW: DailyHoursStatus = 'below'

/** Declared hours match the jornada reference exactly. */
export const COMPLETE: DailyHoursStatus = 'complete'

/** Declared hours exceed the jornada reference. */
export const ABOVE: DailyHoursStatus = 'above'

/** The day has no jornada reference to compare against. */
export const UNAVAILABLE: DailyHoursStatus = 'unavailable'
