import type { ADMIN_ERRORS } from '@/shared/errors'

/** Every outcome the create-user flow can fail with, as the `ADMIN_ERRORS` key that names it. */
const CREATE_CODES = {
  required: 'requiredFields',
  tooShort: 'passwordTooShort',
  taken: 'emailTaken',
  authFailed: 'authCreateFailed',
  reverted: 'authRollbackDone',
  orphaned: 'authRollbackFailed',
  unexpected: 'unexpectedCreate',
} as const satisfies Record<string, keyof typeof ADMIN_ERRORS>

export default CREATE_CODES

// The contract, the service, the rollback and the handler all name these outcomes; written once
// here, the handler's status map and the pieces that produce each code cannot drift apart.
