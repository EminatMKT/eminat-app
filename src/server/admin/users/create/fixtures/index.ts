import type { ExistingUser } from '@/server/admin/users/repo/types'
import type { CreateUserInput } from '@/server/admin/users/create/types'

const newUser: CreateUserInput = {
  email: 'ana@eminat.net',
  password: 'secret-123',
  nombre: 'Ana',
  apellido: 'Paz',
}
const orphanRow: ExistingUser = {
  id: 'u-old',
  auth_id: null,
  nombre: newUser.nombre,
  apellido: newUser.apellido,
}

/** The person the create-user suites create: a valid body, and her row from before she had an account. */
const CREATE_FIXTURES = { newUser, orphanRow }

export default CREATE_FIXTURES

// Test data only. Each suite of the flow used to spell the same body and the same orphan row; one
// copy keeps them describing the same person when a field is added.
