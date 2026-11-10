import { URL } from '../constants'
import { H } from '../seed'

/** Reads any one departamento id with service_role, so availability fixtures that need a
 *  valid departamento_id for ensureTeam() don't have to hardcode one. */
export default async function firstDepartamentoId(): Promise<string> {
  const selectUrl = `${URL}/rest/v1/departamentos?select=id&limit=1`
  const selectInit = { headers: H }
  const response = await fetch(selectUrl, selectInit)
  const rows = await response.json()

  return rows[0].id
}
