import { ALL_MODULES, isModuleSlug, type RoleRow } from './permissions'

export const RESERVED_ROLE_KEYS = new Set(['admin', 'todos'])

export function slugifyRoleKey(label: string): string {
  const base = label.normalize('NFD').replace(/[̀-ͯ]/g, '') // diacríticos
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return /^[a-z]/.test(base) ? base : `rol_${base || Math.abs(hash(label))}`
}
function hash(s: string): number { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h }

type RoleResult = { ok: true; key: string } | { ok: false; error: string }

export function validateNewRole(label: string, existing: RoleRow[]): RoleResult {
  const trimmed = label.trim()
  if (!trimmed) return { ok: false, error: 'El nombre del rol es obligatorio.' }
  if (existing.some((r) => r.label.toLowerCase() === trimmed.toLowerCase()))
    return { ok: false, error: 'Ya existe un rol con ese nombre.' }
  let key = slugifyRoleKey(trimmed)
  if (RESERVED_ROLE_KEYS.has(key)) return { ok: false, error: 'Ese nombre está reservado por el sistema.' }
  const taken = new Set(existing.map((r) => r.key))
  if (taken.has(key)) { let n = 2; while (taken.has(`${key}_${n}`)) n++; key = `${key}_${n}` }
  return { ok: true, key }
}

export function validateModuleSlugs(slugs: string[]): { ok: true } | { ok: false; error: string } {
  const bad = slugs.filter((s) => !isModuleSlug(s))
  return bad.length ? { ok: false, error: `Módulos inválidos: ${bad.join(', ')}` } : { ok: true }
}

// ¿quitar/degradar a este usuario dejaría 0 admins?
export function isLastAdmin(users: { id: string; rol: string }[], targetId: string): boolean {
  const admins = users.filter((u) => u.rol === 'admin')
  return admins.length === 1 && admins[0].id === targetId
}
