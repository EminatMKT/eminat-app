import { URL } from '../constants'
import { H } from '../seed'

type EmailRow = { email: string }

/** Emails of the `usuarios` rows matching a PostgREST filter, read with the service key. */
export default async function emailsWhere(filter: string): Promise<string[]> {
  const endpoint = `${URL}/rest/v1/usuarios?${filter}&select=email`
  const init = { headers: H }
  const response = await fetch(endpoint, init)
  const rows: EmailRow[] = await response.json()
  return rows.map(row => row.email)
}

// A seed-side read for preconditions a spec cannot control: which users of the local DB match a
// filter, seen through the service key so nothing the policies hide is missed. A spec uses it to
// decide whether the shared local state lets it run, never as proof of what a user may read.
