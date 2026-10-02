import { requireMeetTaskActor } from '../_shared/auth'
import { apiAuthFailure, apiFailure, apiJson, optionsResponse } from '../_shared/responses'
import { getTaskCatalogs } from '../_shared/task-service'

export const OPTIONS = optionsResponse
export async function GET(request: Request) {
  const auth = await requireMeetTaskActor(request)
  if (!auth.ok || !auth.actor) return apiAuthFailure(request, auth)
  const result = await getTaskCatalogs(auth.actor.client)
  return result.ok ? apiJson(request, result.data) : apiFailure(request, result)
}
