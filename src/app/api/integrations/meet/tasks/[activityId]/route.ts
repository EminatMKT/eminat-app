import { z } from 'zod'
import { updateMeetTaskSchema } from '../../_shared/contracts'
import { requireMeetTaskActor } from '../../_shared/auth'
import MEET_ERRORS from '../../_shared/errors'
import { apiAuthFailure, apiFailure, apiInvalidPayload, apiJson, optionsResponse } from '../../_shared/responses'
import { getCanonicalTask, updateTask } from '../../_shared/task-service'

export const runtime = 'nodejs'
export const OPTIONS = optionsResponse
const idSchema = z.string().uuid()
type RouteContext = { params: Record<'activityId', string> }

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireMeetTaskActor(request)
  if (!auth.ok || !auth.actor) return apiAuthFailure(request, auth)
  if (!idSchema.safeParse(params.activityId).success) return apiFailure(request, MEET_ERRORS.invalidId)
  const result = await getCanonicalTask(auth.actor.client, params.activityId, auth.actor.authUserId)
  const body = { task: result.data }
  return result.ok ? apiJson(request, body) : apiFailure(request, result)
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireMeetTaskActor(request)
  if (!auth.ok || !auth.actor) return apiAuthFailure(request, auth)
  if (!idSchema.safeParse(params.activityId).success) return apiFailure(request, MEET_ERRORS.invalidId)
  const parsed = updateMeetTaskSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return apiInvalidPayload(request, parsed.error.issues[0]?.message)
  const result = await updateTask(auth.actor.client, auth.actor.authUserId, params.activityId, parsed.data)
  const body = { task: result.data }
  if (result.ok) return apiJson(request, body)
  // A 409 carries the current version so Meet can show the conflict.
  const conflict = result.current ? { current: result.current } : undefined
  return apiFailure(request, result, MEET_ERRORS.taskError, conflict)
}
