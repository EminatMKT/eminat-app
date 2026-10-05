import type { MeetUserRow } from './types'

/** Name shown to Meet for a user: `nombre_display`, else the full name, else the id. */
const displayName = ({
  id,
  nombre_display,
  nombre,
  apellido,
}: MeetUserRow): string => {
  const fullName = `${nombre ?? ''} ${apellido ?? ''}`.trim()
  const named = nombre_display || fullName
  return named || id
}

export default displayName
