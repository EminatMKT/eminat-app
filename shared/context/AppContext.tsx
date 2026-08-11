'use client'
import { createContext, useContext, useMemo, ReactNode } from 'react'
import {
  normalizeRole,
  getModulesForRole,
  ADMIN_ROLE,
  type Role,
  type ModuleSlug,
  type RoleRow,
  type RoleModuleMap,
} from '@/shared/auth/permissions'
import { THEME, inputStyle } from '@/shared/theme/tokens'
import { useAppData } from './useAppData'
import type { Usuario, Notificacion, Actividad, Equipo, OrgRow } from './loadAppData'
import SessionErrorScreen from './SessionErrorScreen'
import { deriveMiembrosPorId, deriveMiembrosAsignables, deriveEquipoMarketing } from './team-derivations'
import { deriveMarcas, deriveColorMarca } from './empresa-derivations'

// ── Re-exports (back-compat) ───────────────────────────────────────────
// Las constantes viven ahora en módulos propios; se re-exportan desde acá para
// no romper los imports existentes (`@/shared/context/AppContext`). Código nuevo
// puede importar directo de shared/constants/* y shared/theme/*.
export {
  MESES, TRIMESTRES, MESES_Q, mesATrimestre, ESTADO_COLORS,
  COLUMNAS_KANBAN, SOLICITANTES, COLORES_AVATAR,
  getIniciales,
} from '@/shared/constants/domain'
export { CARGOS_DIR, DIRECTORIO_DATA, DEPS_DIR } from '@/shared/constants/directorio'

// ── Context ────────────────────────────────────────────────────────────

interface AppContextType {
  usuario: Usuario | null
  actividades: Actividad[]
  equipo: Equipo[]
  usuarios: Usuario[]
  miembrosPorId: Record<string, string>
  miembrosAsignables: { id: string; nombre: string }[]
  equipoMarketing: Usuario[]
  loading: boolean
  dark: boolean
  setDark: (v: boolean) => void
  horaActual: string
  onlineCount: number
  mensaje: { tipo: 'ok' | 'error'; texto: string } | null
  notificaciones: Notificacion[]
  notifAbiertas: boolean
  setNotifAbiertas: (v: boolean) => void
  setNotificaciones: React.Dispatch<React.SetStateAction<Notificacion[]>>
  adminUsuarios: Usuario[]
  setAdminUsuarios: React.Dispatch<React.SetStateAction<Usuario[]>>
  setActividades: React.Dispatch<React.SetStateAction<Actividad[]>>
  setUsuarios: React.Dispatch<React.SetStateAction<Usuario[]>>
  mostrarMensaje: (tipo: 'ok' | 'error', texto: string) => void
  handleLogout: () => void
  esAdmin: boolean
  cargo: string
  roles: RoleRow[]
  roleModuleMap: RoleModuleMap
  reloadRoles: () => Promise<void>
  // Catálogos organizacionales (tab Organización del admin + selects de la ficha).
  empresas: OrgRow[]
  // Derivados de `empresas` para Stratix. `marcas` filtra por activo +
  // recibe_actividades; `colorMarca` cubre TODAS para no perder el color de las
  // actividades históricas de una empresa desactivada.
  marcas: OrgRow[]
  colorMarca: Record<string, string>
  departamentos: OrgRow[]
  equipos: OrgRow[]
  cargos: OrgRow[]
  jornadas: OrgRow[]
  vinculaciones: OrgRow[]
  reloadOrg: () => Promise<void>
  role: Role | null
  modules: ModuleSlug[]
  bg: string
  s1: string
  s2: string
  s3: string
  border: string
  t1: string
  t2: string
  t3: string
  accent: string
  inputStyle: React.CSSProperties
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const { sessionError, ...app } = useAppData()

  const miembrosPorId = deriveMiembrosPorId(app.adminUsuarios)
  const miembrosAsignables = deriveMiembrosAsignables(app.usuarios)
  const equipoMarketing = deriveEquipoMarketing(app.usuarios)
  const marcas = useMemo(() => deriveMarcas(app.empresas), [app.empresas])
  const colorMarca = useMemo(() => deriveColorMarca(app.empresas), [app.empresas])

  // Derived values — all permissions flow from shared/auth/permissions.
  const role: Role | null = normalizeRole(app.usuario?.rol)
  const modules: ModuleSlug[] = getModulesForRole(app.roleModuleMap, role)
  const esAdmin = role === ADMIN_ROLE
  const cargo = app.roles.find(r => r.key === role)?.label || app.usuario?.rol || 'Sin asignar'

  if (sessionError) return <SessionErrorScreen reason={sessionError} />

  return (
    <AppContext.Provider
      value={{
        ...app,
        miembrosPorId,
        miembrosAsignables,
        equipoMarketing,
        marcas,
        colorMarca,
        esAdmin,
        cargo,
        role,
        modules,
        ...THEME,
        inputStyle,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
