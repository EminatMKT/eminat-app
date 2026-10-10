import {
  normalizeRole,
  getModulesForRole,
  ADMIN_ROLE,
  type Role,
  type ModuleSlug,
} from '@/shared/auth/permissions'
import type { useAppData } from '../useAppData'
import type { Usuario } from '../loadAppData'
import { deriveMiembrosPorId, deriveEquipoMarketing } from '../team-derivations'

interface DerivedPermissions {
  miembrosPorId: Record<string, string>
  equipoMarketing: Usuario[]
  role: Role | null
  modules: ModuleSlug[]
  esAdmin: boolean
  cargo: string
}

/** Pure permission + team derivations that AppProvider doesn't need to memoize. */
export default function derivePermissions(
  app: Omit<ReturnType<typeof useAppData>, 'sessionError'>,
): DerivedPermissions {
  const { adminUsuarios, usuarios, roleModuleMap, usuario, roles } = app
  const role = normalizeRole(usuario?.rol)
  const result: DerivedPermissions = {
    miembrosPorId: deriveMiembrosPorId(adminUsuarios),
    equipoMarketing: deriveEquipoMarketing(usuarios),
    role,
    modules: getModulesForRole(roleModuleMap, role),
    esAdmin: role === ADMIN_ROLE,
    cargo: roles.find(r => r.key === role)?.label || usuario?.rol || 'Sin asignar',
  }
  return result
}

// Resolves permissions (role/modules/esAdmin/cargo) plus the two team
// derivations that don't need memoization. AppProvider composes it with
// its own local useMemo values.
