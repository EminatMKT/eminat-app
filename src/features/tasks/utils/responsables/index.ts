import type { ActividadResponsable, ResponsiblesInput, ResponsiblesUser } from '@/features/tasks/types'

const displayNameOf = (user: ResponsiblesUser | undefined) => {
  const fullName = `${user?.nombre?.trim() ?? ''} ${user?.apellido?.trim() ?? ''}`.trim()
  return fullName || user?.name?.trim() || user?.email?.trim() || ''
}
const usersById = (users: ResponsiblesUser[]) => new Map(users.map(user => [user.id, user] as const))

const sortedWith = (act: ResponsiblesInput, byId: Map<string, ResponsiblesUser>): ActividadResponsable[] => {
  const rows = [...(act.responsables ?? [])]
  return rows.sort((a, b) => {
    if (a.es_lider !== b.es_lider) return a.es_lider ? -1 : 1
    const leftName = displayNameOf(byId.get(a.usuario_id))
    const rightName = displayNameOf(byId.get(b.usuario_id))
    if (!!leftName !== !!rightName) return leftName ? -1 : 1
    return leftName.localeCompare(rightName, 'es') || a.usuario_id.localeCompare(b.usuario_id, 'es')
  })
}
const responsablesOrdenados = (act: ResponsiblesInput, usuarios: ResponsiblesUser[]): ActividadResponsable[] =>
  sortedWith(act, usersById(usuarios))

const responsablePrincipal = (act: ResponsiblesInput, usuarios: ResponsiblesUser[]): ActividadResponsable | null =>
  responsablesOrdenados(act, usuarios)[0] ?? null

const esResponsable = (act: ResponsiblesInput, usuarioId: string | null | undefined): boolean => {
  if (!usuarioId) return false
  return (act.responsables ?? []).some(responsible => responsible.usuario_id === usuarioId)
}

const etiquetaResponsablesCompacta = (act: ResponsiblesInput, usuarios: ResponsiblesUser[]): { label: string; lider: boolean } => {
  const byId = usersById(usuarios)
  const ordered = sortedWith(act, byId)
  const main = ordered[0]
  if (!main) return { label: '—', lider: false }
  const name = displayNameOf(byId.get(main.usuario_id)) || '—'
  const extra = ordered.length > 1 ? ` +${ordered.length - 1}` : ''
  return { label: `${name}${extra}`, lider: main.es_lider }
}

const responsables = {
  responsablesOrdenados,
  responsablePrincipal,
  esResponsable,
  etiquetaResponsablesCompacta,
}
export default responsables
// Activity-responsible helpers keep membership, principal selection, and compact labels consistent.
