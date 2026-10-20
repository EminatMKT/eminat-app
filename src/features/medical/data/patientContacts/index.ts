import { supabase } from '@/shared/db'
import { COLUMNS, TABLES, TABLE_COLUMNS } from '@/shared/schema'
import { CONTACT_COLUMNS } from './constants'
import type { PatientContactRow } from './types'

/** Every phone and email row one patient holds, oldest first, one per row — never deduplicated
 *  by value, since each row's id is what a merge may exclude. */
export default function patientContacts(patientId: string) {
  const query = supabase.from(TABLES.pacienteContactos).select(CONTACT_COLUMNS)
    .eq(TABLE_COLUMNS.pacienteContactos.pacienteId, patientId).order(COLUMNS.createdAt)
  return query.overrideTypes<PatientContactRow[], { merge: false }>()
}

// The duplicate review's read of `paciente_contactos`, in a stable order so the checkboxes do not
// reshuffle between two openings of the same pair.
