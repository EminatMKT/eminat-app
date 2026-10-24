import { NextRequest, NextResponse } from 'next/server'
import { validateRanges, type WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import saveSchema from './helpers/schema'
import respond from './helpers/respond'
import authorizeViewer from './repository/authorize-viewer'
import respondWithAvailability from './repository/respond-with-availability'
import saveRpc from './repository/save-rpc'
import normalizeRange from './helpers/normalize'
import {
  INVALID_RANGES_MESSAGE,
  INVALID_RANGES_STATUS,
} from './constants'

export async function GET() {
  const context = await authorizeViewer()
  if (context instanceof NextResponse) return context
  return respondWithAvailability(context.db, context.viewerUserId)
}

export async function PUT(request: NextRequest) {
  const context = await authorizeViewer()
  if (context instanceof NextResponse) return context
  const body = await request.json().catch(() => null)
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) return respond(INVALID_RANGES_MESSAGE, INVALID_RANGES_STATUS)
  const ranges: WeeklyAvailabilityRange[] = parsed.data.ranges.map(normalizeRange)
  const structuralErrors = validateRanges(ranges)
  if (structuralErrors.length > 0) return respond(INVALID_RANGES_MESSAGE, INVALID_RANGES_STATUS)
  const saveError = await saveRpc(context.db, ranges)
  if (saveError) return respond(saveError.message, saveError.status)
  return respondWithAvailability(context.db, context.viewerUserId)
}
