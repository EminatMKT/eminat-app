import { URL } from '../constants'
import { H } from '../seed'

const FULL_TIME_JORNADA_CODE = 'COMPLETA'
const JORNADA_QUERY = `codigo=eq.${FULL_TIME_JORNADA_CODE}&select=id,horas_semana&limit=1`

/** Reads the seeded full-time jornada with service_role — codigo FULL_TIME_JORNADA_CODE, 40
 *  hours a week — so the availability journey spec has a deterministic non-null workday to
 *  compare against. */
export default async function firstActiveJornada(): Promise<{ id: string; horasSemana: number }> {
  const selectUrl = `${URL}/rest/v1/jornadas?${JORNADA_QUERY}`
  const selectInit = { headers: H }

  const response = await fetch(selectUrl, selectInit)
  const rows = await response.json()

  return { id: rows[0].id, horasSemana: rows[0].horas_semana }
}
