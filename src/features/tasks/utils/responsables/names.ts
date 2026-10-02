import type { ResponsiblesUser } from '@/features/tasks/types'

/** Displays hold only the `miembrosPorId` name map; this lets them reuse the form's ordering. */
const usersFromNames = (namesById: Record<string, string>): ResponsiblesUser[] =>
  Object.entries(namesById).map(([id, name]) => ({ id, name }))

export default usersFromNames
