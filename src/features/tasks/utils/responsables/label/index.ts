import type { ResponsiblesInput } from '@/features/tasks/types'
import ordered from '../ordered'
import usersFromNames from '../names'

const EMPTY = '—'
const BETWEEN_NAMES = ', '

/** The payment sheet lists the whole team of a task: leader first, then alphabetical. */
const responsibleNames = (act: ResponsiblesInput, namesById: Record<string, string>): string => {
  const rows = ordered(act, usersFromNames(namesById))
  if (rows.length === 0) return EMPTY
  const names = rows.map(row => namesById[row.usuario_id] ?? EMPTY)
  return names.join(BETWEEN_NAMES)
}

export default responsibleNames

// Every responsible of a task as one printable line, in the same order the form shows them. A
// person whose name is not in the map still takes a slot, as a dash, so the count stays honest.
