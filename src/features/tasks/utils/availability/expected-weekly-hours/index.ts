const DAYS_PER_WEEK = 7

/** Projects a daily jornada reference across the week — the only expectation that can't drift
 *  from the daily figure `DayCaption` already compares against every weekday. */
export default function expectedWeeklyHours(hoursPerDay: number): number {
  return hoursPerDay * DAYS_PER_WEEK
}

// expectedWeeklyHours turns one day's jornada hours into the week-level total the card's hours
// badge compares declared hours against.
