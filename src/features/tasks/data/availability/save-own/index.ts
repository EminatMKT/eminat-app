import type { AvailabilityResponse, SaveOwnAvailabilityRange } from '../types'
import { AVAILABILITY_ENDPOINT, SAVE_FAILED_MESSAGE } from '../constants'

const SAVE_METHOD = 'PUT'
const JSON_CONTENT_TYPE_HEADERS = { 'Content-Type': 'application/json' }

export default async function saveOwnAvailability(
  ranges: SaveOwnAvailabilityRange[],
): Promise<AvailabilityResponse> {
  const requestBody = { ranges }
  const requestInit: RequestInit = {
    method: SAVE_METHOD,
    headers: JSON_CONTENT_TYPE_HEADERS,
    body: JSON.stringify(requestBody),
  }
  const response = await fetch(AVAILABILITY_ENDPOINT, requestInit)

  if (!response.ok) throw new Error(SAVE_FAILED_MESSAGE)

  return response.json()
}

// Browser adapter for PUT /api/tasks/availability: always replaces the caller's OWN ranges —
// there is no target-user parameter, matching the RPC it calls underneath.
