import { supabase } from '@/shared/db/supabase'
import { TABLES, TABLE_COLUMNS } from '@/shared/schema'
import ACTIVITY_SELECT from '../activity-select'
import flattenEmbed from '../flatten-embed'
import type { ActivityRowWithEmbed, OptimisticUpdateResult } from '../types'

const { id: ID, updatedAt: UPDATED_AT } = TABLE_COLUMNS.actividades

const MISSING_VERSION: OptimisticUpdateResult = {
  data: null,
  error: null,
  conflict: true,
  current: null,
}

/** Writes `payload` only while the row still carries the `updated_at` the screen read. */
export default async function optimisticUpdate(
  id: string,
  payload: Record<string, unknown>,
  expectedUpdatedAt: string | undefined,
): Promise<OptimisticUpdateResult> {
  if (!expectedUpdatedAt) return MISSING_VERSION
  const versioned = supabase.from(TABLES.actividades).update(payload).eq(ID, id).eq(UPDATED_AT, expectedUpdatedAt)
  const saved = await versioned.select(ACTIVITY_SELECT).maybeSingle<ActivityRowWithEmbed>()
  if (saved.error) return { data: null, error: saved.error, conflict: false }
  if (saved.data) return { data: flattenEmbed(saved.data), error: null, conflict: false }

  const reread = supabase.from(TABLES.actividades).select(ACTIVITY_SELECT).eq(ID, id)
  const current = await reread.maybeSingle<ActivityRowWithEmbed>()
  const conflict: OptimisticUpdateResult = {
    data: null,
    error: current.error,
    conflict: true,
    current: current.data ? flattenEmbed(current.data) : null,
  }
  return conflict
}

// Every edit of a task compares the `updated_at` the screen read. Zero rows written means another
// session changed or deleted the task in between: the row in force is read back and handed over
// as a conflict, so the screen can show it instead of silently overwriting someone else's change.
// Without a timestamp nothing is written at all — an edit that cannot be checked is a conflict.
