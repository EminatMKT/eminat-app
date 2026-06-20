'use client'
import { createContext, useContext, ReactNode } from 'react'
import {
  normalizeRole,
  getModulesForRole,
  canAccess,
  ROLE_LABELS,
  ROLES as PERMISSION_ROLES,
  type Role,
  type ModuleSlug,
} from '@/shared/auth/permissions'
import { getTheme, type ThemeName } from '@/shared/theme/tokens'
import { useTheme } from '@/shared/theme/useTheme'
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

// Roles are the single source of truth for module access. See shared/auth/permissions.
export const ROLES = PERMISSION_ROLES

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
  theme: ThemeName
  setTheme: (t: ThemeName) => void
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
  esSuperAdmin: boolean
  cargo: string
  canCobranzas: boolean
  canResearch: boolean
  canMedical: boolean
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
  const { theme, setTheme } = useTheme()
  // Compat booleana para lo que aún lee dark/setDark (AppShell, ícono del toggle).
  const dark = theme === 'dark'
  const setDark = (v: boolean) => setTheme(v ? 'dark' : 'light')

  // Derived values — all permissions flow from shared/auth/permissions.
  const role: Role | null = normalizeRole(app.usuario?.rol)
  const modules: ModuleSlug[] = getModulesForRole(role)
  const esSuperAdmin = role === 'admin'
  const cargo = role ? ROLE_LABELS[role] : (app.usuario?.rol || 'Colaborador')
  const canCobranzas = canAccess(role, 'cobranzas')
  const canResearch = canAccess(role, 'research')
  const canMedical = canAccess(role, 'medical')

  if (sessionError) return <SessionErrorScreen reason={sessionError} />

  return (
    <AppContext.Provider
      value={{
        ...app,
        theme,
        setTheme,
        dark,
        setDark,
        esSuperAdmin,
        cargo,
        canCobranzas,
        canResearch,
        canMedical,
        role,
        modules,
        ...getTheme(theme),
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
