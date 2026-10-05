import { DEFAULT_ROLE } from '@/shared/auth/permissions'
import type { ExistingUser } from '@/server/admin/users/repo/types'
import type { CreateUserInput, FinishDeps } from '@/server/admin/users/create/types'

const CARGOS_LOG = '[admin/create-user] cargos not assigned'
const EMAIL_LOG = '[admin/create-user] email warning'

/** After the row is saved: sync cargos, then send the welcome email; answers its warning or null. */
export default async function finish(input: CreateUserInput, existing: ExistingUser | null, authId: string, deps: FinishDeps): Promise<string | null> {
  const { repo, sendWelcome } = deps
  const { email, password, nombre, apellido } = input
  const cargoIds = input.cargoIds ?? []
  const rowId = existing ? existing.id : authId
  // Syncing replaces the whole set, so a link with nothing chosen would wipe the person's cargos.
  const syncs = !existing || cargoIds.length > 0
  const cargoError = syncs ? await repo.syncCargos(rowId, cargoIds) : null
  const cargoFailure = { rowId, error: cargoError?.message }
  if (cargoError) console.warn(CARGOS_LOG, cargoFailure)
  const cargo = await repo.cargoNames(cargoIds)
  const role = input.rol || DEFAULT_ROLE
  const areaLabel = (await repo.roleLabel(role)) || role
  const welcome = {
    nombre,
    apellido,
    email,
    password,
    areaLabel,
    cargo,
  }
  const emailWarning = await sendWelcome(welcome)
  const warned = { authId, email, emailWarning }
  if (emailWarning) console.warn(EMAIL_LOG, warned)
  return emailWarning
}

// Best effort, like the email: the user already exists, and a missed cargo is fixed from
// "Edit user" without leaving anything half-done.
