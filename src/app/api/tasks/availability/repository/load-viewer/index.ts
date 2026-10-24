import type { SupabaseClient } from '@supabase/supabase-js'
import { TABLES, TABLE_COLUMNS } from '@/shared/schema'

const { id, authId, activo } = TABLE_COLUMNS.usuarios
const ACTIVE = true

/** Resolves the caller's own `usuarios.id` from their auth session, or `null` when they carry no
 *  active profile. `authUserId` keeps `Access['userId']`'s own optionality: that type is not a
 *  discriminated union, so an `ok: true` guard upstream cannot narrow it away. */
export default async function loadViewer(
  db: SupabaseClient,
  authUserId: string | undefined,
): Promise<string | null> {
  if (!authUserId) return null
  const { data } = await db
    .from(TABLES.usuarios)
    .select(id)
    .eq(authId, authUserId)
    .eq(activo, ACTIVE)
    .maybeSingle()
  return data?.id ?? null
}
