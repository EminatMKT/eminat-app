import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import loadAvailabilityResponse from '../load-response'
import respond from '@/app/api/tasks/availability/helpers/respond'
import {
  NO_STORE_HEADERS,
  LOAD_FAILED_MESSAGE,
  LOAD_FAILED_STATUS,
} from '@/app/api/tasks/availability/constants'

export default async function respondWithAvailability(db: SupabaseClient, viewerUserId: string) {
  const payload = await loadAvailabilityResponse(db, viewerUserId)
  if (!payload) return respond(LOAD_FAILED_MESSAGE, LOAD_FAILED_STATUS)
  const headersInit = { headers: NO_STORE_HEADERS }
  return NextResponse.json(payload, headersInit)
}
