import { supabase } from '@/shared/db/supabase'
import { TABLES } from '@/shared/schema'
import ACTIVITY_SELECT from '../activity-select'
import flattenEmbed from '../flatten-embed'
import type { ActivityRowWithEmbed } from '../types'

/** Inserts one task and reads it back in the shape the screens already hold. */
export default async function create(payload: Record<string, unknown>) {
  const inserted = supabase.from(TABLES.actividades).insert(payload).select(ACTIVITY_SELECT)
  const result = await inserted.single<ActivityRowWithEmbed>()
  const row = result.data ? flattenEmbed(result.data) : null
  const created = { ...result, data: row }
  return created
}

// The row is read back through the same column list as `list`, so a new task reaches the board
// with its `responsables` already in place; they are saved right after, by `setResponsables`.
