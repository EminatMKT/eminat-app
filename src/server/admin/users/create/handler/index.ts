import { guard, parse, respond, type RespondPolicy, type Result } from '@/server/http'
import requireAdmin from '@/shared/db/requireAdmin'
import usersRepo from '@/server/admin/users/repo'
import { ADMIN_ERRORS } from '@/shared/errors'
import sendWelcomeEmail from '@/server/mail/welcome'
import createUserContract from '@/server/admin/users/create/contract'
import createUser from '@/server/admin/users/create/service'
import CREATE_CODES from '@/server/admin/users/create/codes'

const BAD_REQUEST = 400
const STATUS = {
  [CREATE_CODES.required]: BAD_REQUEST,
  [CREATE_CODES.tooShort]: BAD_REQUEST,
  [CREATE_CODES.authFailed]: BAD_REQUEST,
  [CREATE_CODES.reverted]: BAD_REQUEST,
  [CREATE_CODES.orphaned]: BAD_REQUEST,
  [CREATE_CODES.taken]: 409,
  [CREATE_CODES.unexpected]: 500,
}
const POLICY: RespondPolicy = { success: 201, status: STATUS, catalog: ADMIN_ERRORS }
const UNEXPECTED = CREATE_CODES.unexpected

/** POST /api/admin/create-user: admin only; creates the Auth account and its `usuarios` row. */
export default async function createUserHandler(req: Request): Promise<Response> {
  const denial = await guard(requireAdmin)
  if (denial) return denial
  try {
    const input = await parse(req, createUserContract)
    if (!input.ok) return respond(input, POLICY)
    const deps = { repo: usersRepo(), sendWelcome: sendWelcomeEmail }
    const result = await createUser(input.data, deps)
    return respond(result, POLICY)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ''
    const failure: Result<never> = { ok: false, error: UNEXPECTED, message }
    return respond(failure, POLICY)
  }
}

// guard → parse → service → respond. The only place an `ADMIN_ERRORS` key of this use case gets
// its HTTP status; a body that is not JSON lands in the catch as 500, as the route always did.
