import type { UserRow, UsersRepo } from '@/server/admin/users/repo/types'
import type { WelcomeSender } from '@/server/mail/welcome/types'

type Catalogs = Pick<UserRow, 'empresa_id' | 'jornada_id' | 'vinculacion_id' | 'equipo_id'>
type Looks = Partial<Pick<UserRow, 'rol' | 'color' | 'ubicacion'>>

/** What the admin sends: identity and temporary password, plus optional role, catalogs and cargos. */
export type CreateUserInput = Pick<UserRow, 'nombre' | 'apellido'> & Catalogs & Looks & {
  email: string
  password: string
  cargoIds?: string[]
}

/** The 201 body: the saved row and the welcome-email warning (null when it went out). */
export type CreatedUser = {
  user: Record<string, unknown>
  emailWarning: string | null
}

/** What the best-effort tail (cargos, role label, welcome email) talks to. */
export type FinishDeps = {
  repo: Pick<UsersRepo, 'syncCargos' | 'cargoNames' | 'roleLabel'>
  sendWelcome: WelcomeSender
}

/** What the use case talks to, injected so tests can fake it: the whole repo and the mailer. */
export type CreateUserDeps = Omit<FinishDeps, 'repo'> & { repo: UsersRepo }

// Create-user contracts: request, response and injected ports for the service.
