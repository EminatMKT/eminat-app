import responsables from '@/features/tasks/utils/responsables'
import displayName from './display'
import type { CanonicalResponsibles, Embedded, MeetResponsibleRow, MeetUserRow } from './types'

const firstOf = <T>(value: Embedded<T>): T | null => {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}
const isUser = (user: MeetUserRow | null): user is MeetUserRow => Boolean(user)

const toHelperUser = ({
  id,
  nombre,
  apellido,
  nombre_display,
}: MeetUserRow) => {
  const helperUser = {
    id,
    nombre,
    apellido,
    name: nombre_display,
  }
  return helperUser
}

/** Maps the join-table embed to the Meet shape; the principal comes from the app's `responsablePrincipal`. */
const canonicalResponsibles = (rows?: MeetResponsibleRow[] | null): CanonicalResponsibles => {
  const allRows = rows ?? []
  const users = allRows.map((row) => firstOf(row.usuarios)).filter(isUser)
  const byId = new Map(users.map((user) => [user.id, user] as const))
  const helperUsers = users.map(toHelperUser)
  const membership = { responsables: allRows.map(({ usuario_id, es_lider }) => ({ usuario_id, es_lider })) }
  const nameOf = (id: string) => {
    const user = byId.get(id)
    return user ? displayName(user) : id
  }
  const principalId = responsables.responsablePrincipal(membership, helperUsers)?.usuario_id ?? null
  const principal = principalId ? byId.get(principalId) : undefined
  const ordered = responsables.responsablesOrdenados(membership, helperUsers)
  const result: CanonicalResponsibles = {
    responsable_id: principalId,
    responsable: principalId ? { id: principalId, nombre: nameOf(principalId) } : null,
    responsables: ordered.map((row) => ({ id: row.usuario_id, nombre: nameOf(row.usuario_id), es_lider: row.es_lider })),
    principal: principal ?? null,
  }
  return result
}

export default canonicalResponsibles
// Meet compatibility for responsibles: maps the join-table embed to the principal plus the full list.
