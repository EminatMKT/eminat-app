import { ALL_MODULES, type ModuleSlug } from '../modulos'
import type { Role, RoleModuleMap } from './types'

export type { Role, RoleModuleMap, RoleRow } from './types'

export const ADMIN_ROLE = 'admin'
export const DEFAULT_ROLE = 'sin_asignar'

// Compatibilidad: valores viejos de `usuarios.rol` que pueden seguir apareciendo hasta que
// termine la migración de roles dinámicos.
const LEGACY_TO_NEW: Record<string, Role> = {
  superadmin: 'admin', coordinador: 'admin', colaborador: 'stratix360', pasante: 'stratix360',
}

export function normalizeRole(raw: unknown): Role | null {
  if (typeof raw !== 'string' || !raw) return null
  return LEGACY_TO_NEW[raw] ?? raw
}

export function getModulesForRole(map: RoleModuleMap, role: Role | null): ModuleSlug[] {
  if (!role) return []
  // Sales is a QA-only integration; normal role grants, including admin, never expose it.
  if (role === ADMIN_ROLE) return ALL_MODULES.filter(slug => slug !== 'sales')
  return (map[role] ?? []).filter(slug => slug !== 'sales')
}
// (sin canAccess: los consumidores usan `getModulesForRole(map, role).includes(slug)`)
