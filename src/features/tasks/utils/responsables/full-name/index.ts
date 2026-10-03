import type { ResponsiblesUser } from '@/features/tasks/types'

/** The name a person is shown by: full name, else `name`, else email, else empty. */
const fullName = (user: ResponsiblesUser | undefined): string => {
  const joined = `${user?.nombre?.trim() ?? ''} ${user?.apellido?.trim() ?? ''}`.trim()
  return joined || user?.name?.trim() || user?.email?.trim() || ''
}

export default fullName

// Users reach the responsables helpers from two places — the `usuarios` rows and the id-to-name
// map the displays hold — so every field is optional and the first non-blank one wins. An empty
// string means "no name at all", which the ordering puts after every named person.
