import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/shared/db'
import { TABLES } from '@/shared/data'
import { ID_COLUMN, EMAIL_COLUMN, GENERO_COLUMN, TELEFONO_COLUMN, FECHA_NACIMIENTO_COLUMN, IS_OPERATOR, COUNT_ONLY } from './constants'

type CountResult = { count: number | null; error: PostgrestError | null }

function readCount({ count, error }: CountResult): number {
  if (error) throw error
  return count ?? 0
}
// `head: true` means PostgREST never returns row data, only the match count.
function countQuery() {
  return supabase.from(TABLES.pacientes).select(ID_COLUMN, COUNT_ONLY)
}
async function countTotalPatients(): Promise<number> {
  return readCount(await countQuery())
}
async function countWithEmail(): Promise<number> {
  return readCount(await countQuery().not(EMAIL_COLUMN, IS_OPERATOR, null))
}
async function countByGenero(value: string): Promise<number> {
  return readCount(await countQuery().eq(GENERO_COLUMN, value))
}
async function countBornAfter(sinceIso: string): Promise<number> {
  return readCount(await countQuery().gt(FECHA_NACIMIENTO_COLUMN, sinceIso))
}
async function countBornBetween(sinceIso: string, untilIso: string): Promise<number> {
  const result = await countQuery().lte(FECHA_NACIMIENTO_COLUMN, untilIso).gt(FECHA_NACIMIENTO_COLUMN, sinceIso)
  return readCount(result)
}
async function countBornOnOrBefore(untilIso: string): Promise<number> {
  return readCount(await countQuery().lte(FECHA_NACIMIENTO_COLUMN, untilIso))
}
async function countByAreaCode(code: string): Promise<number> {
  const pattern = `(${code})%`
  return readCount(await countQuery().like(TELEFONO_COLUMN, pattern))
}
/** The Supabase COUNT-only queries the dashboard aggregate is built from. */
const queries = {
  countTotalPatients,
  countWithEmail,
  countByGenero,
  countBornAfter,
  countBornBetween,
  countBornOnOrBefore,
  countByAreaCode,
}

export default queries
