import type {
  Role,
  ModuleSlug,
  RoleRow,
  RoleModuleMap,
} from '@/shared/auth/permissions'
import type { Theme, ThemeName } from '@/shared/theme/tokens'
import type {
  Usuario,
  Notificacion,
  Actividad,
  Equipo,
  OrgRow,
} from '@/shared/context/loadAppData'

export type MiembroAsignable = { id: string; nombre: string }
export type FlashMessage = { tipo: 'ok' | 'error'; texto: string }

/** Shape of the value exposed by AppContext / useApp(). */
export interface AppContextType extends Theme {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  dark: boolean
  setDark: (v: boolean) => void
  usuario: Usuario | null
  actividades: Actividad[]
  equipo: Equipo[]
  usuarios: Usuario[]
  miembrosPorId: Record<string, string>
  miembrosAsignables: MiembroAsignable[]
  equipoMarketing: Usuario[]
  loading: boolean
  horaActual: string
  onlineCount: number
  mensaje: FlashMessage | null
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
  // Organizational catalogs (admin's Organización tab + the profile's selects).
  empresas: OrgRow[]
  // Derived from `empresas` for Stratix. `marcas` filters by activo +
  // recibe_actividades; `colorMarca` covers ALL of them so a deactivated
  // company doesn't lose the color of its historical activities.
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
}

// AppContextType is the shape AppProvider (../index.tsx) builds and useApp() reads.
