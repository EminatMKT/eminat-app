import { normalizeRole } from '@/shared/auth/permissions'
import type { AdminUser } from './types'

// Excepción cross-rol de Stratix 360.
// Freddy Crespín es el Director de Marketing — cabeza de todas las sub-áreas de
// Stratix 360 — aunque su rol de sistema sea 'admin'. Se lo incluye como heredero
// válido al reasignar tareas de un usuario de Stratix 360. NO se generaliza a
// todos los admins; NO aplica a otras áreas. Para dar la misma excepción a otra
// persona, agregar su email acá.
export const STRATIX360_CROSS_ROLE_HEIR_EMAILS = new Set<string>(['freddy@eminat.net'])

// Miembros activos que pueden heredar las tareas del usuario `target`.
export function eligibleHeirs(users: AdminUser[], target: AdminUser): AdminUser[] {
  const targetNormal = normalizeRole(target.rol)
  return users
    .filter(u => {
      if (u.id === target.id) return false
      if (!u.activo) return false
      // Regla por defecto: misma área (rol normalizado).
      if (normalizeRole(u.rol) === targetNormal) return true
      // Excepción Stratix 360: Freddy (y quien esté en STRATIX360_CROSS_ROLE_HEIR_EMAILS)
      // es heredero válido para transferencias de marketing sin importar su rol.
      if (targetNormal === 'stratix360' && STRATIX360_CROSS_ROLE_HEIR_EMAILS.has((u.email || '').toLowerCase())) return true
      return false
    })
    .sort((a, b) => `${a.nombre || ''}`.localeCompare(b.nombre || ''))
}
