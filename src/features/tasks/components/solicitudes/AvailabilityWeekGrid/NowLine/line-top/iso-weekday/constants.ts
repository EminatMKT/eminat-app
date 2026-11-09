import type { Weekday } from '@/features/tasks/utils/availability/types'

/** Indexed by JS `Date.getDay()` (0 = Sunday): the grid's ISO weekday for that day. */
export const ISO_WEEKDAY_BY_JS_DAY: readonly Weekday[] = [7, 1, 2, 3, 4, 5, 6]
