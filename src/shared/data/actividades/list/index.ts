import { supabase } from '@/shared/db/supabase'
import { TABLES, COLUMNS } from '@/shared/schema'
import ACTIVITY_SELECT from '../activity-select'
import flattenEmbed from '../flatten-embed'
import type { ActivityRowWithEmbed } from '../types'

const NEWEST_FIRST = { ascending: false }

/** Every task the session may read, newest first, with its responsables flattened in. */
export default async function list() {
  const ordered = supabase.from(TABLES.actividades).select(ACTIVITY_SELECT).order(COLUMNS.createdAt, NEWEST_FIRST)
  const result = await ordered.overrideTypes<ActivityRowWithEmbed[], { merge: false }>()
  const rows = result.data?.map(flattenEmbed) ?? null
  const listed = { ...result, data: rows }
  return listed
}

// No per-person filter: whoever holds the tasks module sees the whole board, and whoever does not
// gets no row at all — the `colaborador_read` policy decides it. "Each one sees only their own"
// used to be a filter here, not in RLS, and it turned a team board into a personal list; what is
// personal (the pay report, "my tasks") is filtered in the view.
