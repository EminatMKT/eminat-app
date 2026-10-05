import type { ActividadResponsable, ResponsiblesInput, ResponsiblesUser } from '@/features/tasks/types'
import fullName from '../full-name'

const COLLATION_LOCALE = 'es'
const FIRST = -1
const AFTER = 1

const byLeaderThenName = (byId: Map<string, ResponsiblesUser>) => (
  { es_lider: leftLeads, usuario_id: leftId }: ActividadResponsable,
  { es_lider: rightLeads, usuario_id: rightId }: ActividadResponsable,
): number => {
  if (leftLeads !== rightLeads) return leftLeads ? FIRST : AFTER
  const leftName = fullName(byId.get(leftId))
  const rightName = fullName(byId.get(rightId))
  if (!!leftName !== !!rightName) return leftName ? FIRST : AFTER
  return leftName.localeCompare(rightName, COLLATION_LOCALE) || leftId.localeCompare(rightId, COLLATION_LOCALE)
}

/** The responsables of a task, leader first and then by display name; the input is not touched. */
const ordered = (act: ResponsiblesInput, users: ResponsiblesUser[]): ActividadResponsable[] => {
  const byId = new Map(users.map(user => [user.id, user] as const))
  const rows = [...(act.responsables ?? [])]
  return rows.sort(byLeaderThenName(byId))
}

export default ordered

// One order for every place that lists who executes a task — the form, the card, the detail, the
// pay sheet — so the name the card shows is always the first one the detail lists. A person with
// no name sorts after the named ones, and the user id breaks the remaining ties so the order is
// stable between renders.
