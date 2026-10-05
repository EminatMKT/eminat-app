import type { ModuleSlug } from '@/shared/auth/permissions'
import { ACCESS_ERRORS } from '@/shared/errors'
import { RPCS } from '@/shared/schema'
import ssrClient from '@/shared/db/requireAccess/ssrClient'
import type { Access } from '@/shared/db/types'

export default async function requireModule(slug: ModuleSlug): Promise<Access> {
  const ssr = ssrClient()
  const { data: { user } } = await ssr.auth.getUser()
  if (!user) return { ok: false, status: 401, error: ACCESS_ERRORS.notAuthenticated }
  const moduleArgs = { p_slug: slug }
  const { data: allowed } = await ssr.rpc(RPCS.hasModule, moduleArgs)
  if (!allowed) return { ok: false, status: 403, error: ACCESS_ERRORS.moduleRequired(slug) }
  return { ok: true, userId: user.id }
}

// Session + module permission for a non-admin API route. It asks `has_module(slug)`, the SAME
// Postgres function the RLS policies use, so the route cannot drift from what the database
// allows (and inherits the admin short-circuit `is_admin()` already resolves inside).
