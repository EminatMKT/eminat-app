/** Midnight, in minutes since the start of the day — the grid's lower bound. */
export const DAY_START_MINUTE = 0

/** 24:00, in minutes since the start of the day — the grid's upper bound (exclusive end). */
export const DAY_END_MINUTE = 24 * 60

/** Matches the 45px hourly track at the base font size. */
export const PIXELS_PER_MINUTE = 0.75

/** The grid snaps every create/resize edge to this many minutes. */
export const SNAP_MINUTES = 30

/** A click-create defaults to one hour, or the free room available if shorter. */
export const MAX_CLICK_CREATE_MINUTES = 60
