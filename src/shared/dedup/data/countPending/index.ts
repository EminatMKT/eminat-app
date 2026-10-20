import { supabase } from '@/shared/db/supabase'
import { COUNT_ONLY, TABLES, TABLE_COLUMNS } from '@/shared/schema'

const ALL_COLUMNS = '*'
const { entidad: ENTITY_COLUMN } = TABLE_COLUMNS.duplicadosPendientes
const NONE = 0

/** How many duplicate pairs are still waiting on a decision for one entity; rejects if the read fails. */
export default async function countPending(entidad: string): Promise<number> {
  const query = supabase
    .from(TABLES.duplicadosPendientes)
    .select(ALL_COLUMNS, COUNT_ONLY)
    .eq(ENTITY_COLUMN, entidad)
  const { count, error } = await query
  if (error) throw error
  const total = count ?? NONE
  return total
}

// Counts the pending-pair queue for one entity without fetching a row, so a tab can show how many
// pairs await review. Sibling of `listPendientes`, which reads the same queue in full.
