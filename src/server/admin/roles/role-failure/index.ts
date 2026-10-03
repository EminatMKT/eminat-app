import type { PostgrestError } from '@supabase/supabase-js'

type RoleFailure = { status: number; error: string }

/** What `save_role` raises, by SQLSTATE, as the answer the admin UI shows. */
const KNOWN: Record<string, RoleFailure> = {
  '23505': { status: 400, error: 'A role with that key or label already exists.' },
  '22023': { status: 400, error: 'System role modules cannot be edited.' },
  P0002: { status: 404, error: 'Role not found.' },
}
const UNKNOWN_STATUS = 400

/** Maps a `save_role` error to the status and message the role routes answer with. */
const roleFailure = ({ code, message }: Pick<PostgrestError, 'code' | 'message'>): RoleFailure => {
  const fallback: RoleFailure = { status: UNKNOWN_STATUS, error: message }
  return KNOWN[code] ?? fallback
}

export default roleFailure

// roleFailure keeps the SQLSTATE → HTTP mapping of the role routes in one place, so both routes
// answer a duplicate or a system role the same way.
