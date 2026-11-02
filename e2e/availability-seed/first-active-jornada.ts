import { URL } from '../constants'
import { H } from '../seed'

const FULL_TIME_JORNADA_CODE = 'COMPLETA'

/** Reads the seeded full-time jornada with service_role — codigo FULL_TIME_JORNADA_CODE, 8
 *  hours a day — so the availability journey spec has a deterministic non-null workday to
 *  compare against. */
export default async function firstActiveJornada(): Promise<{ id: string; horasDia: number }> {
  const selectUrl = `${URL}/rest/v1/jornadas?codigo=eq.${FULL_TIME_JORNADA_CODE}&select=id,horas_dia&limit=1`
  const selectInit = { headers: H }

  const response = await fetch(selectUrl, selectInit)
  const rows = await response.json()

  return { id: rows[0].id, horasDia: rows[0].horas_dia }
}
