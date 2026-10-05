import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { ADMIN_ROLE, normalizeRole } from '@/shared/auth/permissions'
import { ACCESS_ERRORS } from '@/shared/errors'
import { TABLES, TABLE_COLUMNS } from '@/shared/schema'
import ssrClient from '@/shared/db/requireAccess/ssrClient'
import type { Access } from '@/shared/db/types'

const { usuarios } = TABLE_COLUMNS
const ID_AND_ROLE = 'id,rol,activo'

export default async function requireAdmin(): Promise<Access> {
  const { data: { user } } = await ssrClient().auth.getUser()
  if (!user) return { ok: false, status: 401, error: ACCESS_ERRORS.notAuthenticated }
  const { data: row } = await supabaseAdmin().from(TABLES.usuarios).select(ID_AND_ROLE).eq(usuarios.authId, user.id).maybeSingle()
  const isAdmin = row?.activo === true && normalizeRole(row.rol) === ADMIN_ROLE
  if (!isAdmin) return { ok: false, status: 403, error: ACCESS_ERRORS.adminRequired }
  return { ok: true, userId: row.id }
}

// Reads the caller's session (SSR cookies) and checks that their role in the DB is admin. The
// admin routes call it to close access server-side before mutating anything. Server-only: it
// uses `next/headers` and the service_role client, so `@/shared/db` does not re-export it.
