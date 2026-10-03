import type { ActividadResponsable } from '@/features/tasks/types'
import { etiquetaResponsablesCompacta, usersFromNames } from '@/features/tasks/utils/responsables'

type Member = Record<'id' | 'nombre', string>

const CROWN = '👑'

/** What the closed responsables box reads: the placeholder, or the card's `👑 Leader +N`. */
export default function pickerDisplay(members: readonly Member[], rows: ActividadResponsable[], placeholder: string) {
  if (rows.length === 0) return placeholder
  const namesById = Object.fromEntries(members.map(m => [m.id, m.nombre]))
  const responsibles = { responsables: rows }
  const { label, lider } = etiquetaResponsablesCompacta(responsibles, usersFromNames(namesById))
  const crowned = `${CROWN} ${label}`
  return lider ? crowned : label
}

// The same compact label the task card draws, so the form and the card name the same people the
// same way. A text box cannot hold the card's crown icon, so the crown is the emoji.
