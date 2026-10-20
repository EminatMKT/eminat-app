import { supabase } from '@/shared/db/supabase'
import { TABLES, TABLE_COLUMNS } from '@/shared/schema'
import type { Pendiente } from '@/shared/dedup/types'

const SELECT_TODO = '*'
const { entidad: COLUMNA_ENTIDAD } = TABLE_COLUMNS.duplicadosPendientes

/** Every pending duplicate pair for one entity, unsorted — `ordenarPendientes` orders them. */
export default function listPendientes(entidad: string) {
  const query = supabase
    .from(TABLES.duplicadosPendientes)
    .select(SELECT_TODO)
    .eq(COLUMNA_ENTIDAD, entidad)
  return query.overrideTypes<Pendiente[], { merge: false }>()
}

// Reads the pending-pair queue for one entity. `DuplicatesTab` calls this on mount and after
// every scan, discard or merge, so the list always reflects what is still waiting on a decision.
