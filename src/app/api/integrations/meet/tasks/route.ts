import { createMeetTaskSchema } from '../_shared/contracts'
import { requireMeetTaskActor } from '../_shared/auth'
import { apiAuthFailure, apiFailure, apiInvalidPayload, apiJson, optionsResponse } from '../_shared/responses'
import { createTaskForTopic, listCanonicalTasks } from '../_shared/task-service'
import { dispatchTaskAssignmentEmails } from '@/features/tasks/server/notifications'

export const runtime = 'nodejs'
export const OPTIONS = optionsResponse

export async function GET(request: Request) {
  const auth = await requireMeetTaskActor(request)
  if (!auth.ok || !auth.actor) return apiAuthFailure(request, auth)
  const result = await listCanonicalTasks(auth.actor.client, auth.actor.authUserId, auth.actor.profileId)
  if (!result.ok || !result.data) return apiFailure(request, result)
  return apiJson(request, result.data)
}

export async function POST(request: Request) {
  const auth = await requireMeetTaskActor(request)
  if (!auth.ok || !auth.actor) return apiAuthFailure(request, auth)
  const parsed = createMeetTaskSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return apiInvalidPayload(request, parsed.error.issues[0]?.message)
  const result = await createTaskForTopic(auth.actor.client, auth.actor.authUserId, parsed.data)
  if (!result.ok || !result.data) return apiFailure(request, result)
  await dispatchTaskAssignmentEmails(result.data.task.id).catch(() => null)
  return apiJson(request, result.data, result.data.idempotent ? 200 : 201)
}
