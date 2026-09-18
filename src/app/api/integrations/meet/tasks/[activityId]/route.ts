import { z } from 'zod'
import { updateMeetTaskSchema } from '../../_shared/contracts'
import { requireMeetTaskActor } from '../../_shared/auth'
import { apiError, apiJson, optionsResponse } from '../../_shared/responses'
import { getCanonicalTask, updateTask } from '../../_shared/task-service'

export const runtime = 'nodejs'
export const OPTIONS = optionsResponse
const idSchema = z.string().uuid()

export async function GET(request: Request, { params }: { params: { activityId: string } }) {
  const auth = await requireMeetTaskActor(request)
  if (!auth.ok || !auth.actor) return apiError(request, auth.status ?? 401, 'UNAUTHORIZED', auth.error ?? 'No autenticado.')
  if (!idSchema.safeParse(params.activityId).success) return apiError(request, 400, 'INVALID_ID', 'activityId inválido.')
  const result = await getCanonicalTask(auth.actor.client, params.activityId, auth.actor.authUserId)
  return result.ok ? apiJson(request, { task: result.data }) : apiError(request, result.status ?? 500, result.code ?? 'TASK_ERROR', result.message ?? 'Error de TASK.')
}

export async function PATCH(request: Request, { params }: { params: { activityId: string } }) {
  const auth = await requireMeetTaskActor(request)
  if (!auth.ok || !auth.actor) return apiError(request, auth.status ?? 401, 'UNAUTHORIZED', auth.error ?? 'No autenticado.')
  if (!idSchema.safeParse(params.activityId).success) return apiError(request, 400, 'INVALID_ID', 'activityId inválido.')
  const parsed = updateMeetTaskSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return apiError(request, 400, 'INVALID_PAYLOAD', parsed.error.issues[0]?.message ?? 'Payload inválido.')
  const result = await updateTask(auth.actor.client, auth.actor.authUserId, params.activityId, parsed.data)
  return result.ok ? apiJson(request, { task: result.data }) : apiError(request, result.status ?? 500, result.code ?? 'TASK_ERROR', result.message ?? 'Error de TASK.', result.current ? { current: result.current } : undefined)
}
