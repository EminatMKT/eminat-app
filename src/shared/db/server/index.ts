export { default as requireAdmin } from '../requireAdmin'
export { default as usersRepo } from '../users'
export { serverEnv } from '../env.server'
export { clientEnv } from '../env.client'
export type { UsersRepo, UserRow, ExistingUser, DbFailure } from '../users/types'

// The data layer's server-only door: the admin guard, service_role repositories and the secrets.
// Kept apart from `@/shared/db`, which must stay safe to import from the browser.
