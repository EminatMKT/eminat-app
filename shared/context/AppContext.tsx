'use client'
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/shared/db/supabase'
import { signOutAndRedirect, loadProfile } from '@/shared/db/session'
import { useRouter } from 'next/navigation'
import {
  normalizeRole,
  getModulesForRole,
  canAccess,
  ROLE_LABELS,
  ROLES as PERMISSION_ROLES,
  type Role,
  type ModuleSlug,
} from '@/shared/auth/permissions'
import { CARGOS_DIR } from '@/shared/constants/directorio'
import { THEME, inputStyle } from '@/shared/theme/tokens'

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

// Borra las cookies de auth de Supabase (sb-*-auth-token) del lado del cliente.
// El middleware decide por PRESENCIA de la cookie, no por validez: si el token
// quedó corrupto/expirado, supabase.auth.signOut() puede no limpiarla y el
// middleware rebota /login → / en bucle. Limpiarla a mano garantiza la salida.
function clearAuthCookies() {
  if (typeof document === 'undefined') return
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim()
    if (name.startsWith('sb-')) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    }
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter()

  const [usuario, setUsuario] = useState<any>(null)
  // Estado terminal cuando el perfil no carga: render de pantalla estable en vez
  // de auto-navegar (evita el bucle de reloads ante un fallo persistente).
  const [sessionError, setSessionError] = useState<null | 'no-session' | 'no-profile' | 'error'>(null)
  const [actividades, setActividades] = useState<any[]>([])
  const [equipo, setEquipo] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(true)
  const [horaActual, setHoraActual] = useState('')
  const [onlineCount, setOnlineCount] = useState(0)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [notificaciones, setNotificaciones] = useState<any[]>([])
  const [notifAbiertas, setNotifAbiertas] = useState(false)
  const [adminUsuarios, setAdminUsuarios] = useState<any[]>([])

  // Derived values — all permissions flow from shared/auth/permissions.
  const role: Role | null = normalizeRole(usuario?.rol)
  const modules: ModuleSlug[] = getModulesForRole(role)
  const esSuperAdmin = role === 'admin'
  const cargo = role
    ? ROLE_LABELS[role]
    : (usuario?.rol || 'Colaborador')
  const canCobranzas = canAccess(role, 'cobranzas')
  const canResearch = canAccess(role, 'research')
  const canMedical = canAccess(role, 'medical')

  const mostrarMensaje = useCallback((tipo: 'ok' | 'error', texto: string) => {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 3000)
  }, [])

  const handleLogout = useCallback(async () => {
    // signOut() puede colgarse si la sesión quedó en mal estado. signOutAndRedirect
    // garantiza el redirect aunque eso pase (timeout). clearAuthCookies antes de
    // navegar evita que una cookie stale rebote /login → / en el middleware.
    await signOutAndRedirect(
      () => supabase.auth.signOut(),
      (url) => { clearAuthCookies(); window.location.href = url },
    )
  }, [])

  useEffect(() => {
    let heartbeatInterval: ReturnType<typeof setInterval>
    let clockInterval: ReturnType<typeof setInterval>
    let realtimeChannel: any

    async function init() {
      try {
        // 1-2. Carga crítica del perfil (sesión + fila activa en 'usuarios' por email).
        //    loadProfile falla en cerrado: ante no-session / no-profile / error,
        //    cerramos sesión y vamos al login en vez de dejar la UI en estado zombie
        //    (perfil sin cargar pero sesión viva → "Welcome, undefined" + Sign out muerto).
        const result = await loadProfile(supabase)
        if (!result.ok) {
          // NO auto-navegar: un redirect en cada montaje, ante un fallo persistente,
          // genera un bucle de reloads. Mostramos una pantalla de error estable y
          // limpiamos la sesión best-effort (sin await, por si signOut se cuelga).
          setSessionError(result.reason ?? 'error')
          setLoading(false)
          clearAuthCookies()
          void supabase.auth.signOut().catch(() => {})
          return
        }
        const usr = result.usuario
        setUsuario(usr)

        const normalized = normalizeRole(usr.rol)
        const isSuperAdmin = normalized === 'admin'

        // 3. Heartbeat - update online_at every 30s
        const doHeartbeat = () => {
          supabase.from('usuarios').update({ online_at: new Date().toISOString() }).eq('id', usr.id).then(() => {})
        }
        doHeartbeat()
        heartbeatInterval = setInterval(doHeartbeat, 30000)

        // 4. Count online users (online_at within last 5 minutes)
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const { count } = await supabase
          .from('usuarios')
          .select('*', { count: 'exact', head: true })
          .gte('online_at', fiveMinAgo)
        setOnlineCount(count || 0)

        // 5. Load notifications + realtime subscription
        const { data: notifs } = await supabase
          .from('notificaciones')
          .select('*')
          .eq('usuario_id', usr.id)
          .order('created_at', { ascending: false })
          .limit(50)
        setNotificaciones(notifs || [])

        realtimeChannel = supabase
          .channel(`notif-${usr.id}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${usr.id}` },
            (payload: any) => {
              setNotificaciones(prev => [payload.new, ...prev])
            }
          )
          .subscribe()

        // 6. Load actividades
        let actQuery = supabase.from('actividades').select('*').order('created_at', { ascending: false })
        if (!isSuperAdmin && usr.responsable_ref) {
          actQuery = actQuery.eq('responsable_ref', usr.responsable_ref)
        }
        const { data: acts } = await actQuery
        setActividades(acts || [])

        // 7. Load equipo from v_equipo_hoy
        const { data: eq } = await supabase.from('v_equipo_hoy').select('*')
        setEquipo(eq || [])

        // 8. Load usuarios (activo=true)
        const { data: usrs } = await supabase
          .from('usuarios')
          .select('*')
          .eq('activo', true)
          .order('nombre', { ascending: true })
        setUsuarios(usrs || [])

        // 9. Load adminUsuarios with CARGOS_DIR mapping
        const { data: allUsrs } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false })
        setAdminUsuarios((allUsrs || []).map((u: any) => ({ ...u, cargo: u.cargo || CARGOS_DIR[u.email?.toLowerCase()] || '' })))
      } catch (err) {
        console.error('AppContext init error:', err)
      } finally {
        setLoading(false)
      }
    }

    init()

    // 10. Update time every second
    const updateTime = () => {
      setHoraActual(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateTime()
    clockInterval = setInterval(updateTime, 1000)

    return () => {
      clearInterval(heartbeatInterval)
      clearInterval(clockInterval)
      if (realtimeChannel) supabase.removeChannel(realtimeChannel)
    }
  }, [router])

  // Pantalla de error estable: cuando el perfil no cargó, renderizamos esto en vez
  // de auto-navegar (que generaba bucle) o dejar la UI zombie. El usuario sale con
  // un clic manual (hard redirect, sin posibilidad de loop).
  if (sessionError) {
    const msg = sessionError === 'no-profile'
      ? 'Tu cuenta no tiene un perfil activo.'
      : sessionError === 'no-session'
        ? 'Tu sesión expiró.'
        : 'No se pudo cargar tu sesión.'
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F', gap: 14, color: '#fff', fontFamily: 'DM Sans, sans-serif', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{msg}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', maxWidth: 420, lineHeight: 1.5 }}>
          Volvé a iniciar sesión. Si el problema persiste, contactá al administrador.
        </div>
        <button onClick={() => { clearAuthCookies(); void supabase.auth.signOut().catch(() => {}); window.location.href = '/login' }}
          style={{ marginTop: 8, padding: '10px 22px', borderRadius: 10, border: 'none', background: '#7C6FF7', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Ir al login
        </button>
      </div>
    )
  }

  return (
    <AppContext.Provider
      value={{
        usuario,
        actividades,
        equipo,
        usuarios,
        loading,
        dark,
        setDark,
        horaActual,
        onlineCount,
        mensaje,
        notificaciones,
        notifAbiertas,
        setNotifAbiertas,
        setNotificaciones,
        adminUsuarios,
        setAdminUsuarios,
        setActividades,
        setUsuarios,
        mostrarMensaje,
        handleLogout,
        esSuperAdmin,
        cargo,
        canCobranzas,
        canResearch,
        canMedical,
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
