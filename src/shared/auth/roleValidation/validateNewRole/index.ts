import { ADMIN_ROLE, type RoleRow } from '@/shared/auth/permissions'
import { ROLE_ERRORS } from '@/shared/errors'
import slugifyRoleKey from '@/shared/auth/roleValidation/slugifyRoleKey'
import type { RoleResult } from '@/shared/auth/roleValidation/types'

// `todos` is the "all" value of the role filters: a role keyed that way would be unselectable.
const ALL_ROLES_KEY = 'todos'
const RESERVED_ROLE_KEYS = new Set([ADMIN_ROLE, ALL_ROLES_KEY])
const SUFFIX_SEPARATOR = '_'

export default function validateNewRole(label: string, existing: RoleRow[]): RoleResult {
  const trimmed = label.trim()
  if (!trimmed) return { ok: false, error: ROLE_ERRORS.nameRequired }
  if (existing.some((r) => r.label.toLowerCase() === trimmed.toLowerCase()))
    return { ok: false, error: ROLE_ERRORS.nameTaken }
  let key = slugifyRoleKey(trimmed)
  if (RESERVED_ROLE_KEYS.has(key)) return { ok: false, error: ROLE_ERRORS.nameReserved }
  const taken = new Set(existing.map((r) => r.key))
  const suffixed = (n: number) => [key, n].join(SUFFIX_SEPARATOR)
  if (taken.has(key)) { let n = 2; while (taken.has(suffixed(n))) n++; key = suffixed(n) }
  return { ok: true, key }
}

// Validates the label of a role about to be created and derives its key. The label must be
// non-empty and not taken (case-insensitive); the key comes from `slugifyRoleKey`, may not be a
// reserved one, and when another role already holds it gets the first free `_2`, `_3`… suffix.
