import { z } from 'zod'
import type { Validation } from '@/server/http/types'
import CREATE_CODES from '@/server/admin/users/create/codes'
import type { CreateUserInput } from '@/server/admin/users/create/types'

const { required: REQUIRED, tooShort: TOO_SHORT } = CREATE_CODES
const MIN_PASSWORD = 8

const text = z.string(REQUIRED).min(1, REQUIRED)
// Any truthy value counts as present; the refine below is what makes it a long-enough string.
const present = z.custom<string>(Boolean, REQUIRED)
const PRESENT = {
  email: text,
  password: present,
  nombre: text,
  apellido: text,
}
const isLongEnough = (body: Pick<CreateUserInput, 'password'>) =>
  typeof body.password === 'string' && body.password.length >= MIN_PASSWORD
// The refine's issue comes after the fields' issues, so a missing field is always reported first.
const SCHEMA = z.looseObject(PRESENT).refine(isLongEnough, TOO_SHORT)

/** Validates a create-user body; issue messages are `ADMIN_ERRORS` keys. */
export default function createUserContract(body: unknown): Validation<CreateUserInput> {
  const verdict: Validation<CreateUserInput> = SCHEMA.safeParse(body)
  return verdict
}

// The optional fields (role, catalogs, cargos) pass through untouched, as the route always took
// them: the service applies their defaults.
