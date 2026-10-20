import { supabase } from '@/shared/db'
import { TABLES, TABLE_COLUMNS } from '@/shared/schema'
import {
  FULFILLED,
  ID_BATCH,
  NAME_COLUMNS,
  REJECTED,
} from './constants'
import type { PatientName } from './types'

const readBatch = async (batch: string[]): Promise<PatientName[]> => {
  const { data, error } = await supabase.from(TABLES.pacientes).select(NAME_COLUMNS)
    .in(TABLE_COLUMNS.pacientes.id, batch).overrideTypes<PatientName[], { merge: false }>()
  if (error) throw error
  const rows = data ?? []
  return rows
}

const rowsOf = (result: PromiseSettledResult<PatientName[]>): PatientName[] => {
  if (result.status === FULFILLED) return result.value
  return []
}

/** `id`, `nombre` and `apellido` of each given patient, `ID_BATCH` ids per request. Batches that
 *  loaded are kept even when another failed; it rejects only when every batch failed. */
export default async function patientNames(ids: string[]): Promise<PatientName[]> {
  const batches: string[][] = []
  for (let start = 0; start < ids.length; start += ID_BATCH) batches.push(ids.slice(start, start + ID_BATCH))
  const settled = await Promise.allSettled(batches.map(readBatch))
  const names = settled.flatMap(rowsOf)
  const failure = settled.find((result): result is PromiseRejectedResult => result.status === REJECTED)
  if (names.length === 0 && failure) throw failure.reason
  return names
}

// Feeds the pending-duplicates list: one query per 100 ids instead of one per patient.
