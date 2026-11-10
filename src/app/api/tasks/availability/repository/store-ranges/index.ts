import { NextResponse, type NextRequest } from 'next/server'
import parseRanges from '@/app/api/tasks/availability/helpers/parse-ranges'
import type { ViewerContext } from '@/app/api/tasks/availability/types'
import saveRpc from '../save-rpc'
import respondWithAvailability from '../respond-with-availability'

export default async function storeRanges(
  { db, viewerUserId }: ViewerContext,
  request: NextRequest,
) {
  const ranges = await parseRanges(request)
  const failure = ranges instanceof NextResponse ? ranges : await saveRpc(db, ranges)

  return failure ?? respondWithAvailability(db, viewerUserId)
}

// The PUT path for an authorized viewer: a body that fails parsing or a save the RPC rejects is
// answered as is; a stored body is answered with the refreshed visible availability.
