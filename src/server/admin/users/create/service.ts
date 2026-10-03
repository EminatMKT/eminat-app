import { ADMIN_ERRORS } from '@/shared/errors'
import type { Result } from '@/server/http/types'
import buildRow from './row'
import rollback from './rollback'
import finish from './finish'
import type { CreateUserDeps, CreateUserInput, CreatedUser } from './types'

const TAKEN = 'emailTaken'
const AUTH_FAILED = 'authCreateFailed'
const UNEXPECTED = 'unexpectedCreate'
const AUTH_LOG = '[admin/create-user] auth.createUser failed'
const UNEXPECTED_LOG = '[admin/create-user] unexpected — attempting auth rollback'
const logUndoFailure = (undoError: unknown) => console.error(UNEXPECTED_LOG, undoError)

/** Creates the Auth account and its `usuarios` row (linking a row that has none), then welcomes the person. */
export default async function createUser(input: CreateUserInput, deps: CreateUserDeps): Promise<Result<CreatedUser>> {
  const { repo } = deps
  const { email, password } = input
  let authId: string | null = null
  try {
    // A row with no account (seeds, an aborted delete) is linked: inserting would hit the unique email.
    const existing = await repo.findByEmail(email)
    const holder = `${existing?.nombre} ${existing?.apellido}`
    const taken: Result<CreatedUser> = { ok: false, error: TAKEN, message: ADMIN_ERRORS.emailTaken(holder) }
    if (existing?.auth_id) return taken
    const auth = await repo.createAuth(email, password)
    const authRejected = Boolean(auth.error) || !auth.id
    const authFailure = { email, error: auth.error?.message }
    const authFailed: Result<CreatedUser> = { ok: false, error: AUTH_FAILED, message: auth.error?.message }
    if (authRejected) console.error(AUTH_LOG, authFailure)
    if (authRejected) return authFailed
    authId = auth.id
    const row = buildRow(input, existing, authId)
    const saving = existing ? repo.linkRow(existing.id, row) : repo.insertRow(row)
    const saved = await saving
    if (saved.error) return await rollback(repo, saved.error, authId)
    const emailWarning = await finish(input, existing, authId, deps)
    const created: Result<CreatedUser> = { ok: true, data: { user: saved.data, emailWarning } }
    return created
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ''
    const context = { authId, message }
    console.error(UNEXPECTED_LOG, context)
    if (authId) await repo.deleteAuth(authId).catch(logUndoFailure)
    const unexpected: Result<CreatedUser> = { ok: false, error: UNEXPECTED, message }
    return unexpected
  }
}

// Statuses are not decided here: each error is an `ADMIN_ERRORS` key, mapped by the handler's
// policy. Auth is created before the row so a failed row can always be rolled back.
