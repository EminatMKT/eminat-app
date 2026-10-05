import { ACCESS_ERRORS } from '@/shared/errors'
import ssrClient from '@/shared/db/requireAccess/ssrClient'
import type { Access } from '@/shared/db/types'

export default async function requireSignedIn(): Promise<Access> {
  const { data: { user } } = await ssrClient().auth.getUser()
  if (!user) return { ok: false, status: 401, error: ACCESS_ERRORS.notAuthenticated }
  return { ok: true, userId: user.id }
}

// Sign-in-only guard for the non-admin API routes. `middleware.ts` skips `/api` on purpose —an
// API route must answer a JSON 401, not redirect to /login—, so every handler gates itself;
// without it the route is open to the internet, as /api/mail was (19/08/2026).
