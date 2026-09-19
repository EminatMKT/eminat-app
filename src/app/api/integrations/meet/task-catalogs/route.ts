import { requireMeetTaskActor } from '../_shared/auth'
import { apiError, apiJson, optionsResponse } from '../_shared/responses'
import { getTaskCatalogs } from '../_shared/task-service'

export const OPTIONS = optionsResponse
export async function GET(request: Request) {
  const auth = await requireMeetTaskActor(request)
  if (!auth.ok || !auth.actor) return apiError(request, auth.status ?? 401, 'UNAUTHORIZED', auth.error ?? 'No autenticado.')
  const result = await getTaskCatalogs(auth.actor.client)
  return result.ok ? apiJson(request, result.data) : apiError(request, result.status ?? 500, result.code ?? 'TASK_ERROR', result.message ?? 'Error de TASK.')
}
