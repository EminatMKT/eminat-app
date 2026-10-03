import type { CompactResponsibleLabel, ResponsiblesInput, ResponsiblesUser } from '@/features/tasks/types'
import fullName from '../full-name'
import ordered from '../ordered'

const NOBODY: CompactResponsibleLabel = { label: '—', lider: false }

/** One name for who executes a task, like `Ana Bravo +2`, and whether that name leads it. */
export default function compactLabel(act: ResponsiblesInput, usuarios: ResponsiblesUser[]): CompactResponsibleLabel {
  const rows = ordered(act, usuarios)
  const main = rows[0]
  if (!main) return NOBODY
  const user = usuarios.find(candidate => candidate.id === main.usuario_id)
  const name = fullName(user) || NOBODY.label
  const extra = rows.length > 1 ? ` +${rows.length - 1}` : ''
  return { label: `${name}${extra}`, lider: main.es_lider }
}

// The card has room for one name, so it shows the head of the shared order and counts the rest.
// The barrel offers it as `etiquetaResponsablesCompacta`, the name its callers use.
