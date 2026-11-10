import { URL } from '../constants'
import { H } from '../seed'

const INSERT_URL = `${URL}/rest/v1/equipos?on_conflict=codigo`
const UPSERT_HEADERS = { ...H, Prefer: 'resolution=merge-duplicates,return=representation' }

type TeamSeed = {
  codigo: string
  nombre: string
  departamentoId: string
}

function upsertInit({ codigo, nombre, departamentoId }: TeamSeed): RequestInit {
  const teamBody = { codigo, nombre, departamento_id: departamentoId }
  const init = { method: 'POST', headers: UPSERT_HEADERS, body: JSON.stringify(teamBody) }

  return init
}

async function upsertFailure(response: Response, codigo: string): Promise<Error> {
  const errorBody = await response.text()
  const errorMessage = `ensureTeam ${codigo}: ${response.status} ${errorBody}`

  return new Error(errorMessage)
}

/** Upserts a test team by codigo with service_role and returns its id, so the availability
 *  specs place their users in a team of their own instead of a seeded one. */
export default async function ensureTeam(team: TeamSeed): Promise<string> {
  const response = await fetch(INSERT_URL, upsertInit(team))

  if (!response.ok) throw await upsertFailure(response, team.codigo)

  const rows = await response.json()

  return rows[0].id
}
