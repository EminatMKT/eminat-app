import ssrClient from '@/shared/db/requireAccess/ssrClient'
import type { Access } from '@/shared/db/types'
import respond from '@/app/api/tasks/availability/helpers/respond'
import {
  PROFILE_UNAVAILABLE_MESSAGE,
  PROFILE_UNAVAILABLE_STATUS,
} from '@/app/api/tasks/availability/constants'
import loadViewer from '../load-viewer'

export default async function authorizeViewer({ ok, userId, ...denial }: Access) {
  if (!ok) return respond(denial.error, denial.status)

  const db = ssrClient()
  const viewerUserId = await loadViewer(db, userId)

  if (!viewerUserId) return respond(PROFILE_UNAVAILABLE_MESSAGE, PROFILE_UNAVAILABLE_STATUS)

  return { db, viewerUserId }
}

// Takes the outcome of the module guard the route already ran: a denial is answered as is, before
// any database client exists; a grant resolves the active `usuarios.id` behind the session.
