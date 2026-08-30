import type { ModuleSlug } from '../modulos/slugs'

// Un rol es un string: los crea el admin desde /admin → Roles, así que no hay unión cerrada
// que valga. Por eso los permisos se preguntan por módulo y nunca por nombre de rol.
export type Role = string

export type RoleModuleMap = Record<string, ModuleSlug[]>
export type RoleRow = { key: string; label: string; is_system: boolean }
