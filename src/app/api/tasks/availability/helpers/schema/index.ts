import { z } from 'zod'
import { END_OF_DAY_TIME, TIME_PATTERN } from '@/features/tasks/utils/availability/constants'
import { NOTE_MAX_LENGTH, MAX_RANGES_PER_REQUEST } from '@/app/api/tasks/availability/constants'

const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 7] as const
const WEEKDAY_SCHEMAS = WEEKDAY_VALUES.map((weekday) => z.literal(weekday))

const rangeShape = {
  weekday: z.union(WEEKDAY_SCHEMAS),
  startsAt: z.string().regex(TIME_PATTERN),
  endsAt: z.string().regex(TIME_PATTERN).or(z.literal(END_OF_DAY_TIME)),
  note: z.string().trim().max(NOTE_MAX_LENGTH).nullable().optional(),
}
const rangeSchema = z.object(rangeShape).strict()

/** Strict shape of `PUT /api/tasks/availability`'s body — `weekday` is a `1`-`7` literal union so
 *  the inferred type matches the domain's `Weekday` with no cast, and no field can target
 *  anyone but the caller: there is nowhere in this shape to write a `userId`. */
const saveShape = { ranges: z.array(rangeSchema).max(MAX_RANGES_PER_REQUEST) }
const saveSchema = z.object(saveShape).strict()

export default saveSchema

// The strict zod contract of the PUT body: unknown keys are rejected at both levels, times are
// canonical HH:mm (or the end-of-day marker), and the range count is capped per request.
