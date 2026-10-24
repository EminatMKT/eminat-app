import { NextResponse } from 'next/server'
import requireModule from '@/shared/db/requireAccess/requireModule'
import ssrClient from '@/shared/db/requireAccess/ssrClient'
import { MODULE } from '@/shared/auth/permissions'
import loadViewer from '../load-viewer'
import respond from '@/app/api/tasks/availability/helpers/respond'
import { PROFILE_UNAVAILABLE_MESSAGE, PROFILE_UNAVAILABLE_STATUS } from '@/app/api/tasks/availability/constants'
import type { ViewerContext } from '@/app/api/tasks/availability/types'

/** Gates `tasks` access and resolves the caller's own `usuarios.id` behind their session, so
 *  `GET`/`PUT` share one authorization path instead of each repeating it. */
export default async function authorizeViewer(): Promise<ViewerContext | NextResponse> {
  const authz = await requireModule(MODULE.TASKS)
  if (!authz.ok) return respond(authz.error, authz.status)
  const db = ssrClient()
  const viewerUserId = await loadViewer(db, authz.userId)
  if (!viewerUserId) return respond(PROFILE_UNAVAILABLE_MESSAGE, PROFILE_UNAVAILABLE_STATUS)
  return { db, viewerUserId }
}
