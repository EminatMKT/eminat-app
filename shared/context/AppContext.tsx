'use client'
import { createContext, useContext, ReactNode } from 'react'
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
import SessionErrorScreen from './SessionErrorScreen'

// ── Re-exports (back-compat) ───────────────────────────────────────────
// Las constantes viven ahora en módulos propios; se re-exportan desde acá para
// no romper los imports existentes (`@/shared/context/AppContext`). Código nuevo
// puede importar directo de shared/constants/* y shared/theme/*.
export {
  MESES, TRIMESTRES, MESES_Q, mesATrimestre, MARCAS_LIST, ESTADO_COLORS,
  COLUMNAS_KANBAN, MIEMBROS_REFS, SOLICITANTES, COLORES_AVATAR,
  getColorMarca, getIniciales,
} from '@/shared/constants/domain'
export { CARGOS_DIR, DIRECTORIO_DATA, DEPS_DIR } from '@/shared/constants/directorio'

// Re-exported from shared/constants/companies.ts for back-compat with existing imports.
// New code should import directly from '@/shared/constants/companies'.
import { COMPANY_NAMES as _COMPANY_NAMES, COMPANY_COLORS as _COMPANY_COLORS } from '@/shared/constants/companies'
export const EMPRESAS = _COMPANY_NAMES
export const EMPRESA_COLORS = _COMPANY_COLORS

// ── Context ────────────────────────────────────────────────────────────

interface AppContextType {
  usuario: any
  actividades: any[]
  equipo: any[]
  usuarios: any[]
  loading: boolean
  dark: boolean
  setDark: (v: boolean) => void
  horaActual: string
  onlineCount: number
  mensaje: { tipo: 'ok' | 'error'; texto: string } | null
  notificaciones: any[]
  notifAbiertas: boolean
  setNotifAbiertas: (v: boolean) => void
  setNotificaciones: React.Dispatch<React.SetStateAction<any[]>>
  adminUsuarios: any[]
  setAdminUsuarios: React.Dispatch<React.SetStateAction<any[]>>
  setActividades: React.Dispatch<React.SetStateAction<any[]>>
  setUsuarios: React.Dispatch<React.SetStateAction<any[]>>
  mostrarMensaje: (tipo: 'ok' | 'error', texto: string) => void
  handleLogout: () => void
  esAdmin: boolean
  cargo: string
  roles: RoleRow[]
  roleModuleMap: RoleModuleMap
  reloadRoles: () => Promise<void>
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
