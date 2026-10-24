import { z } from 'zod'
import { TIME_PATTERN } from '@/features/tasks/utils/availability/constants'
import { NOTE_MAX_LENGTH, MAX_RANGES_PER_REQUEST } from '@/app/api/tasks/availability/constants'

const WEEKDAY_SCHEMAS = [
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
] as const

const rangeShape = {
  weekday: z.union(WEEKDAY_SCHEMAS),
  startsAt: z.string().regex(TIME_PATTERN),
  endsAt: z.string().regex(TIME_PATTERN),
  note: z.string().trim().max(NOTE_MAX_LENGTH).nullable().optional(),
}
const rangeSchema = z.object(rangeShape).strict()

/** Strict shape of `PUT /api/tasks/availability`'s body — `weekday` is a `1`-`7` literal union so
 *  the inferred type matches the domain's `Weekday` with no cast, and no field can target
 *  anyone but the caller: there is nowhere in this shape to write a `userId`. */
const saveShape = { ranges: z.array(rangeSchema).max(MAX_RANGES_PER_REQUEST) }
const saveSchema = z.object(saveShape).strict()

export default saveSchema
