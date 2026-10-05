import { ADMIN_ERRORS } from '@/shared/errors'
import type { DbFailure, UsersRepo } from '@/server/admin/users/repo/types'
import type { Result } from '@/server/http/types'
import CREATE_CODES from '@/server/admin/users/create/codes'

const { reverted: REVERTED, orphaned: ORPHANED } = CREATE_CODES
const ORPHAN_LOG = '[admin/create-user] auth rollback ALSO failed — ORPHAN auth.users row'

/** Undoes the Auth account after its row failed; answers the row failure plus how the undo went. */
export default async function rollback(repo: Pick<UsersRepo, 'deleteAuth'>, failure: DbFailure, authId: string): Promise<Result<never>> {
  const undo = await repo.deleteAuth(authId)
  const orphan = { authId, error: undo?.message }
  if (undo) console.error(ORPHAN_LOG, orphan)
  const orphanDetail = undo && ADMIN_ERRORS.authRollbackFailed(undo.message, authId)
  const detail = orphanDetail || ADMIN_ERRORS.authRollbackDone
  const result: Result<never> = {
    ok: false,
    error: undo ? ORPHANED : REVERTED,
    message: `${failure.message}.${detail}`,
    extra: { dbErrorCode: failure.code },
  }
  return result
}

// Nothing is left half-created: if the undo itself fails, the message names the orphan Auth id
// so the admin can delete it from the Supabase dashboard.
