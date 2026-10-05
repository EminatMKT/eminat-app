import { supabaseAdmin, syncUsuarioCargos, cargoNames } from '@/server/db'
import { TABLES, TABLE_COLUMNS } from '@/shared/schema'
import type { UserRow, UsersRepo } from './types'

const { usuarios, roles } = TABLE_COLUMNS
const EXISTING = 'id, auth_id, nombre, apellido'

/** service_role data access for creating a user: the `usuarios` row, its Auth account, cargos and role. */
export default function usersRepo(): UsersRepo {
  const db = supabaseAdmin()
  const rows = () => db.from(TABLES.usuarios)
  const findByEmail = async (email: string) => {
    const { data } = await rows().select(EXISTING).eq(usuarios.email, email).maybeSingle()
    return data
  }
  const createAuth = async (email: string, password: string) => {
    const attrs = { email, password, email_confirm: true }
    const { data, error } = await db.auth.admin.createUser(attrs)
    const created = { id: data?.user?.id, error }
    return created
  }
  const deleteAuth = async (authId: string) => (await db.auth.admin.deleteUser(authId)).error
  const insertRow = async (row: UserRow) => rows().insert(row).select().single()
  const linkRow = async (id: string, row: UserRow) => rows().update(row).eq(usuarios.id, id).select().single()
  const roleLabel = async (key: string) => {
    const { data } = await db.from(TABLES.roles).select(roles.label).eq(roles.key, key).maybeSingle()
    return data?.label ?? null
  }
  const syncCargos = (rowId: string, cargoIds: string[]) => syncUsuarioCargos(db, rowId, cargoIds)
  const names = (cargoIds: string[]) => cargoNames(db, cargoIds)
  const repo: UsersRepo = {
    findByEmail,
    createAuth,
    deleteAuth,
    insertRow,
    linkRow,
    roleLabel,
    syncCargos,
    cargoNames: names,
  }
  return repo
}

// Server-only (service_role): the one place the create-user flow touches tables and Auth.
// Services get it injected, so they never import the client.
