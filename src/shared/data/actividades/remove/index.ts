import { supabase } from '@/shared/db/supabase'
import { TABLES, TABLE_COLUMNS } from '@/shared/schema'

const ID = TABLE_COLUMNS.actividades.id

/** Deletes one task and reads the deleted row back. */
export default function remove(id: string) {
  return supabase.from(TABLES.actividades).delete().eq(ID, id).select().single()
}

// `single()` makes a row that no longer exists fail, so the screen shows the error instead of
// pretending it deleted something.
