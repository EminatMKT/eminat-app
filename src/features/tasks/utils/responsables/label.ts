// Every responsible of a task as one printable line, in the same order the form shows them.
import type { ResponsiblesInput } from '@/features/tasks/types'
import responsables from './index'
import usersFromNames from './names'

const EMPTY = '—'

/** The payment sheet lists the whole team of a task: leader first, then alphabetical. */
const responsibleNames = (act: ResponsiblesInput, namesById: Record<string, string>): string => {
  const ordered = responsables.responsablesOrdenados(act, usersFromNames(namesById))
  if (ordered.length === 0) return EMPTY
  return ordered.map(row => namesById[row.usuario_id] ?? EMPTY).join(', ')
}

export default responsibleNames
