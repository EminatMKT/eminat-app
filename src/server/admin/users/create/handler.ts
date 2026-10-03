import { guard, parse, respond, type RespondPolicy, type Result } from '@/server/http'
import { requireAdmin, usersRepo } from '@/shared/db/server'
import { ADMIN_ERRORS } from '@/shared/errors'
import sendWelcomeEmail from '@/server/mail/welcome'
import createUserContract from './contract'
import createUser from './service'

const BAD_REQUEST = 400
const STATUS = {
  requiredFields: BAD_REQUEST,
  passwordTooShort: BAD_REQUEST,
  authCreateFailed: BAD_REQUEST,
  authRollbackDone: BAD_REQUEST,
  authRollbackFailed: BAD_REQUEST,
  emailTaken: 409,
  unexpectedCreate: 500,
}
const POLICY: RespondPolicy = { success: 201, status: STATUS, catalog: ADMIN_ERRORS }
const UNEXPECTED = 'unexpectedCreate'

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
