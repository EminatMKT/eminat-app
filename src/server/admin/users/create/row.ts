import { DEFAULT_ROLE } from '@/shared/auth/permissions'
import type { ExistingUser, UserRow } from '@/shared/db/server'
import type { CreateUserInput } from './types'

const DEFAULT_COLOR = '#7C6FF7'
const DEFAULT_LOCATION = 'Guayaquil, Ecuador'
const CATALOGS = ['empresa_id', 'jornada_id', 'vinculacion_id', 'equipo_id'] as const

/** The `usuarios` row to write: a new one is keyed by the Auth id; a link keeps its own id. */
export default function buildRow(input: CreateUserInput, existing: ExistingUser | null, authId: string): UserRow {
  const {
    email,
    nombre,
    apellido,
    rol,
    color,
    ubicacion,
  } = input
  const row: UserRow = {
    nombre,
    apellido,
    rol: rol || DEFAULT_ROLE,
    color: color || DEFAULT_COLOR,
    ubicacion: ubicacion || DEFAULT_LOCATION,
    activo: true,
    validado: true,
    auth_id: authId,
  }
  // Linking is not editing: a catalog the admin did not choose again must not be wiped.
  for (const key of CATALOGS) {
    if (input[key]) row[key] = input[key]
    else if (!existing) row[key] = null
  }
  if (existing) return row
  row.id = authId
  row.email = email
  return row
}

// A new row's id IS the Auth id so lookups and JWT claims agree; a linked row keeps its old id
// because activities point at it by FK.
