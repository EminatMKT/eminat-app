/** The calendar billing counts its days in (approved contract, decision 6). */
export const BUSINESS_TIME_ZONE = 'America/Guayaquil'

/** The pattern of an ISO date-only string, for `formatInTimeZone`. */
export const ISO_DAY = 'yyyy-MM-dd'

/** Appended to an ISO date to name the instant that day begins. */
export const MIDNIGHT = 'T00:00:00'

// The values `business-day` reads, apart from the logic that reads them. The zone is the one a
// change of policy would touch, and it is here so that change is a one-line diff.
