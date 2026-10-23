import { URL } from '../constants'
import { H } from '../seed'

type AssignOrganizationArgs = {
  userId: string
  equipoId: string | null
  jornadaId: string | null
}

/** Sets a test user's team and workday with service_role (bypasses RLS), so the weekly-
 *  availability RLS fixtures can place owner/teammate/outsider/teamless identities
 *  deterministically. */
export default async function assignOrganization({
  userId,
  equipoId,
  jornadaId,
}: AssignOrganizationArgs): Promise<void> {
  const patchUrl = `${URL}/rest/v1/usuarios?id=eq.${userId}`
  const body = { equipo_id: equipoId, jornada_id: jornadaId }
  const patchInit = {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  }
  const response = await fetch(patchUrl, patchInit)
  if (!response.ok) {
    const errorBody = await response.text()
    const errorMessage = `assignOrganization ${userId}: ${response.status} ${errorBody}`
    throw new Error(errorMessage)
  }
}
