import type { ActividadResponsable, ResponsiblesInput, ResponsiblesUser } from '@/features/tasks/types'
import ordered from '../ordered'

/** The one person a task is shown under: its leader, else the first by display name, else null. */
export default function responsablePrincipal(
  act: ResponsiblesInput,
  usuarios: ResponsiblesUser[],
): ActividadResponsable | null {
  return ordered(act, usuarios)[0] ?? null
}

// It is the head of the shared order, so the card, the detail and the integrations agree on who
// "the" responsable of a task is.
