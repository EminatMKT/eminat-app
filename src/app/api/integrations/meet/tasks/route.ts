import { createMeetTaskSchema } from '../_shared/contracts'
import { requireMeetTaskActor } from '../_shared/auth'
import { apiError, apiJson, optionsResponse } from '../_shared/responses'
import { createTaskForTopic } from '../_shared/task-service'

export const runtime = 'nodejs'
export const OPTIONS = optionsResponse

export async function POST(request: Request) {
  const auth = await requireMeetTaskActor(request)
  if (!auth.ok || !auth.actor) return apiError(request, auth.status ?? 401, 'UNAUTHORIZED', auth.error ?? 'No autenticado.')
  const parsed = createMeetTaskSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return apiError(request, 400, 'INVALID_PAYLOAD', parsed.error.issues[0]?.message ?? 'Payload inválido.')
  const result = await createTaskForTopic(auth.actor.client, auth.actor.authUserId, parsed.data)
  if (!result.ok || !result.data) return apiError(request, result.status ?? 500, result.code ?? 'TASK_ERROR', result.message ?? 'Error de TASK.')
  return apiJson(request, result.data, result.data.idempotent ? 200 : 201)
}
