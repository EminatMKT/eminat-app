import { URL } from '../constants'
import { H } from '../seed'

/** Deletes a test team by codigo with service_role. Teardown only: the response is not checked,
 *  so a team that is already gone does not fail the suite. */
export default async function deleteTeam(codigo: string): Promise<void> {
  const deleteUrl = `${URL}/rest/v1/equipos?codigo=eq.${codigo}`
  const deleteInit = { method: 'DELETE', headers: H }

  await fetch(deleteUrl, deleteInit)
}
