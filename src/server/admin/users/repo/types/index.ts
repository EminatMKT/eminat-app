/** The `usuarios` row written by an insert or a link; a link leaves out what was not chosen. */
export type UserRow = {
  id?: string
  auth_id: string
  email?: string
  nombre: string
  apellido: string
  rol: string
  color: string
  ubicacion: string
  activo: boolean
  validado: boolean
  empresa_id?: string | null
  jornada_id?: string | null
  vinculacion_id?: string | null
  equipo_id?: string | null
}

/** A `usuarios` row found by email: enough to tell "already has an account" from "link it". */
export type ExistingUser = Pick<UserRow, 'nombre' | 'apellido'> & {
  id: string
  auth_id: string | null
}

/** A failed write, as Supabase reports it. */
export type DbFailure = {
  message: string
  code?: string
}

/** The Auth account just created (its id), or why it was not. */
export type AuthCreated = {
  id?: string
  error?: DbFailure
}

/** The saved row as the database returns it, or the failure. */
export type RowSaved = {
  data?: Record<string, unknown>
  error?: DbFailure
}

/** service_role data access for creating a user. */
export type UsersRepo = {
  findByEmail: (email: string) => Promise<ExistingUser | null>
  createAuth: (email: string, password: string) => Promise<AuthCreated>
  deleteAuth: (authId: string) => Promise<DbFailure | null>
  insertRow: (row: UserRow) => Promise<RowSaved>
  linkRow: (id: string, row: UserRow) => Promise<RowSaved>
  syncCargos: (rowId: string, cargoIds: string[]) => Promise<DbFailure | null>
  cargoNames: (cargoIds: string[]) => Promise<string>
  roleLabel: (key: string) => Promise<string | null>
}

// The shapes the users repo trades with its callers: flat answers ({ id, error }, { data, error })
// instead of Supabase client responses, so services and their tests never touch the client.
