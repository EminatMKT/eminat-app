import { NextResponse, type NextRequest } from 'next/server'
import type { Access } from '@/shared/db/types'
import authorizeViewer from '../authorize-viewer'
import respondWithAvailability from '../respond-with-availability'
import storeRanges from '../store-ranges'

export default async function serveRequest(authz: Access, request?: NextRequest) {
  const context = await authorizeViewer(authz)

  if (context instanceof NextResponse) return context

  if (!request) return respondWithAvailability(context.db, context.viewerUserId)

  return storeRanges(context, request)
}

// Both verbs of the route after its module guard: the viewer is authorized first, so a denial or
// a missing profile never reads a body; GET (no request) reads, PUT stores its body then reads.
