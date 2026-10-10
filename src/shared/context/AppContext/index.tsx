'use client'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from 'react'
import { getTheme } from '@/shared/theme/tokens'
import { useTheme } from '@/shared/theme/useTheme'
import { useAppData } from '../useAppData'
import SessionErrorScreen from '../SessionErrorScreen'
import { deriveMiembrosAsignables } from '../team-derivations'
import { deriveMarcas, deriveColorMarca } from '../empresa-derivations'
import derivePermissions from '../permission-derivations'
import type { AppContextType } from './types'

// ── Re-exports (back-compat) ───────────────────────────────────────────
// Re-exported here so existing imports of `@/shared/context/AppContext` keep
// working; new code should import directly from shared/constants/* and shared/theme/*.
export {
  MESES, TRIMESTRES, MESES_Q, mesATrimestre, ESTADO_COLORS,
  COLUMNAS_KANBAN, COLORES_AVATAR,
  getIniciales,
} from '@/shared/constants/domain'
export { CARGOS_DIR, DIRECTORIO_DATA, DEPS_DIR } from '@/shared/constants/directorio'

// ── Context ────────────────────────────────────────────────────────────
// AppContextType lives in ./types — the rest of this module is AppProvider/useApp.

const AppContext = createContext<AppContextType | undefined>(undefined)
const USE_APP_OUTSIDE_PROVIDER = 'useApp must be used within AppProvider'

export function AppProvider({ children }: PropsWithChildren) {
  const { sessionError, ...app } = useAppData()
  const { theme, setTheme } = useTheme()
  const [LIGHT, DARK] = ['light', 'dark'] as const
  // Boolean compat for what still reads dark/setDark (ThemeToggle).
  const dark = theme === DARK
  const setDark = (v: boolean) => setTheme(v ? DARK : LIGHT)
  // `.dark` on <html> gates the dark block of the --c-* vars (globals.css) and
  // Tailwind's darkMode:'class' — everything painted with CSS Modules or Tailwind
  // classes follows the toggle through this, with no per-file wiring.
  useEffect(() => void document.documentElement.classList.toggle(DARK, dark), [dark, DARK])

  // Memoized here because they depend on app's full lists; the rest of the
  // derived values (permissions + team, no memo) live in ../permission-derivations.
  const miembrosAsignables = useMemo(() => deriveMiembrosAsignables(app.usuarios, app.roleModuleMap), [app.usuarios, app.roleModuleMap])
  const [marcas, colorMarca] = useMemo(() => [deriveMarcas(app.empresas), deriveColorMarca(app.empresas)], [app.empresas])
  const { miembrosPorId, equipoMarketing, role, modules, esAdmin, cargo } = derivePermissions(app)
  if (sessionError) return <SessionErrorScreen reason={sessionError} />
  return (
    <AppContext.Provider
      value={{
        ...app,
        theme,
        setTheme,
        dark,
        setDark,
        miembrosPorId,
        miembrosAsignables,
        equipoMarketing,
        marcas,
        colorMarca,
        esAdmin,
        cargo,
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
  if (!ctx) throw new Error(USE_APP_OUTSIDE_PROVIDER)
  return ctx
}
// Builds the AppContextType value (theme + useAppData's state + the derived
// permission/team fields) and exposes it through useApp().
