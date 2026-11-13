import type { AvailabilityResponse } from '../types'
import { AVAILABILITY_ENDPOINT, LOAD_FAILED_MESSAGE } from '../constants'

export default async function fetchVisibleAvailability(): Promise<AvailabilityResponse> {
  const requestInit: RequestInit = { cache: 'no-store' }
  const response = await fetch(AVAILABILITY_ENDPOINT, requestInit)

  if (!response.ok) throw new Error(LOAD_FAILED_MESSAGE)

  return response.json()
}

// Browser adapter for GET /api/tasks/availability: one lazy read of every member the viewer
// may see, already grouped and serialized by the route — this file only wraps the fetch.
