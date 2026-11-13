import type { NextRequest } from 'next/server'
import { validateRanges } from '@/features/tasks/utils/availability'
import {
  INVALID_RANGES_MESSAGE,
  INVALID_RANGES_STATUS,
} from '@/app/api/tasks/availability/constants'
import saveSchema from '../schema'
import normalizeRange from '../normalize'
import respond from '../respond'

export default async function parseRanges(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = saveSchema.safeParse(body)
  const ranges = parsed.success ? parsed.data.ranges.map(normalizeRange) : null
  const isValid = ranges !== null && validateRanges(ranges).length === 0

  return isValid ? ranges : respond(INVALID_RANGES_MESSAGE, INVALID_RANGES_STATUS)
}

// Turns the PUT body into normalized ranges, or into the same 400 response whether the body is
// not JSON, fails the strict schema, or carries ranges that `validateRanges` rejects.
