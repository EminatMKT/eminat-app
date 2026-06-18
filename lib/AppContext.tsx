'use client'
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { signOutAndRedirect, loadProfile } from '@/lib/session'
import { useRouter } from 'next/navigation'
import {
  normalizeRole,
  getModulesForRole,
  canAccess,
  ROLE_LABELS,
  ROLES as PERMISSION_ROLES,
  type Role,
  type ModuleSlug,
} from './permissions'

// ── Constants ──────────────────────────────────────────────────────────

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export const TRIMESTRES = ['General', 'Q1', 'Q2', 'Q3', 'Q4']

export const MESES_Q: Record<string, string[]> = {
  General: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  Q1: ['Enero', 'Febrero', 'Marzo'],
  Q2: ['Abril', 'Mayo', 'Junio'],
  Q3: ['Julio', 'Agosto', 'Septiembre'],
  Q4: ['Octubre', 'Noviembre', 'Diciembre'],
}

export const mesATrimestre: Record<string, string> = {
  Enero: 'Q1', Febrero: 'Q1', Marzo: 'Q1',
  Abril: 'Q2', Mayo: 'Q2', Junio: 'Q2',
  Julio: 'Q3', Agosto: 'Q3', Septiembre: 'Q3',
  Octubre: 'Q4', Noviembre: 'Q4', Diciembre: 'Q4',
}

export const MARCAS_LIST = [
  { codigo: 'EMC', color: '#60A5FA', label: 'Medical Center' },
  { codigo: 'SVN', color: '#F472B6', label: 'Soy Vivi Negrete' },
  { codigo: 'ERG', color: '#A78BFA', label: 'Research Group' },
  { codigo: 'VNF', color: '#FB923C', label: 'VN Foundation' },
  { codigo: 'PREMIER', color: '#34D399', label: 'Premier' },
  { codigo: 'ORNELLA', color: '#F87171', label: 'Ornella IA' },
  { codigo: 'MENTOR', color: '#FBB040', label: 'Eminat Mentor' },
]

export const ESTADO_COLORS: Record<string, string> = {
  Completado: '#34D399',
  'Por aprobar': '#FBB040',
  'En proceso': '#7C6FF7',
  Pendiente: '#9494B3',
}

export const COLUMNAS_KANBAN = ['Pendiente', 'En proceso', 'Por aprobar', 'Completado']

export const MIEMBROS_REFS: Record<string, string> = {
  DG_Joselyn: 'Joselyn',
  DGA_David: 'David',
  Jonathan_CRM: 'Jonathan',
  DG_Ariana: 'Ariana',
  'CM_ Naomi': 'Naomi',
  EV_Bryan: 'Bryan',
  Coord_MFreddy: 'Freddy',
}

export const SOLICITANTES = [
  { value: 'Coord_MFreddy', label: 'Freddy Crespin \u2014 Marketing Director' },
  { value: 'Rafaella', label: 'Rafaella' },
  { value: 'CEO_Vivi', label: 'Vivi Negrete \u2014 CEO' },
  { value: 'COO_Javier', label: 'Javier Andrade \u2014 COO' },
  { value: 'EMC', label: 'EMC \u2014 Medical Center' },
  { value: 'ERG', label: 'ERG \u2014 Research Group' },
  { value: 'SVN', label: 'SVN \u2014 Soy Vivi Negrete' },
  { value: 'VNF', label: 'VNF \u2014 Foundation' },
  { value: 'PREMIER', label: 'PREMIER \u2014 Premier' },
]

export const COLORES_AVATAR = ['#7C6FF7', '#34D399', '#F472B6', '#60A5FA', '#FB923C', '#FBB040', '#A78BFA', '#F87171']

// Roles are the single source of truth for module access. See lib/permissions.ts.
// Old DB values (pasante/colaborador/coordinador/superadmin) are mapped
// transparently via normalizeRole() until the DB migration completes.
export const ROLES = PERMISSION_ROLES

// Re-exported from shared/constants/companies.ts for back-compat with existing imports.
// New code should import directly from '@/shared/constants/companies'.
import { COMPANY_NAMES as _COMPANY_NAMES, COMPANY_COLORS as _COMPANY_COLORS } from '@/shared/constants/companies'
export const EMPRESAS = _COMPANY_NAMES
export const EMPRESA_COLORS = _COMPANY_COLORS

export const CARGOS_DIR: Record<string, string> = {
  'freddy@eminat.net': 'Marketing Director',
  'joselyne@eminat.net': 'Graphic Designer',
  'david@eminat.net': 'Graphic Designer & Animations',
  'jonathan@eminat.net': 'CRM Developer / Full Stack',
  'ariana@eminat.net': 'Graphic Designer (Pasante)',
  'naomi@eminat.net': 'Community Manager (Pasante)',
  'bryan@eminat.net': 'Video Editor (Pasante)',
  'ceo@eminat.net': 'CEO',
  'javier@eminat.net': 'COO',
  'dmsardina@eminat.net': 'Director Clinical Research',
  'ntorres@eminat.net': 'Finance & Admin Director',
  'erick@eminat.net': 'Business Development Director',
  'raul@eminat.net': 'Director Digital Transformation',
  'ivannia@eminat.net': 'Premier Manager',
}

export const DIRECTORIO_DATA = [
  { nombre: 'Sandra Viviana Negrete', nickname: 'Vivi', cargo: 'CEO', email: 'ceo@eminat.net', ubicacion: 'USA', credenciales: 'MBA', departamento: 'Leadership', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Javier Andrade', nickname: 'Javi', cargo: 'COO', email: 'javier@eminat.net', ubicacion: 'USA', credenciales: 'MD, MPH', departamento: 'Leadership', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Emilio Andrade-Negrete', cargo: 'Clinical Research Regulatory Coordinator', email: 'emilioandraden@eminat.net', ubicacion: 'USA', departamento: 'Leadership', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Natalya Andrade-Negrete', cargo: 'VNF Coordinator', email: 'natalyaandraden@eminat.net', ubicacion: 'USA', departamento: 'Leadership', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Dayrelis Mesa-Sardina', nickname: 'Day', cargo: 'Director Clinical Research Operations', email: 'dmsardina@eminat.net', ubicacion: 'USA', credenciales: 'PA-C, MCMs, MPH', departamento: 'Directors', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Daniel Valderrama', nickname: 'Dani', cargo: 'Director Medical Center Operations', email: 'daniel@eminat.net', ubicacion: 'USA', departamento: 'Directors', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Norma Torres', nickname: 'Normita', cargo: 'Finance and Administrative Director', email: 'ntorres@eminat.net', ubicacion: 'USA', credenciales: 'ECON', departamento: 'Directors', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Erick Lebed', cargo: 'Business Development Director', email: 'erick@eminat.net', ubicacion: 'USA', credenciales: 'BBA', departamento: 'Directors', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Raul Hernandez', nickname: 'Coach', cargo: 'Director Digital Transformation', email: 'raul@eminat.net', ubicacion: 'USA', credenciales: 'ENG', departamento: 'Directors', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Freddy Crespin', nickname: 'Mr Freddy', cargo: 'Marketing Director', email: 'freddy@eminat.net', ubicacion: 'Ecuador', departamento: 'Directors', empresa: 'Eminat Group', color: '#F472B6' },
  { nombre: 'Ivannia Castrillo', nickname: 'Ivannita', cargo: 'Eminat Premier Manager', email: 'ivannia@eminat.net', ubicacion: 'USA', departamento: 'Directors', empresa: 'Premier by Eminat', color: '#FB923C' },
  { nombre: 'Maria Jose Malaguera', nickname: 'Majito', cargo: 'Accounting Lead', email: 'majo@eminat.net', ubicacion: 'Ecuador', departamento: 'Finance', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Ana Vargas', nickname: 'Anita', cargo: 'Accounting Coordinator', email: 'ana@eminat.net', ubicacion: 'Ecuador', departamento: 'Finance', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Livingsthone Andrade', cargo: 'Latin America Manager', email: 'landrade@eminat.net', ubicacion: 'Ecuador', credenciales: 'MSES', departamento: 'Finance', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Ronny Andrade', cargo: 'Head of Partnerships', email: 'randrade@eminat.net', ubicacion: 'Ecuador', credenciales: 'MBA', departamento: 'Finance', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Federico Salviche', cargo: 'Business Development Associate', email: 'federico@eminat.net', ubicacion: 'USA', departamento: 'Business Dev', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Lina Guerrero', cargo: 'Business Development Associate', email: 'lina@eminat.net', ubicacion: 'USA', departamento: 'Business Dev', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Leonardo Salazar', nickname: 'Leo', cargo: 'Senior Clinical Research Coordinator', email: 'lsalazar@eminat.net', ubicacion: 'USA', credenciales: 'MD, RMA, FMG', departamento: 'Research', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Diana Hernandez', nickname: 'Dianita', cargo: 'Senior Clinical Research Coordinator', email: 'diana@eminat.net', ubicacion: 'USA', credenciales: 'MD, RMA, FMG', departamento: 'Research', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Lisandra Cruz', nickname: 'Lissy', cargo: 'Clinical Research Coordinator', email: 'lcruz@eminat.net', ubicacion: 'USA', departamento: 'Research', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Joselyne Guerrero', nickname: 'Joss', cargo: 'Graphic Designer', email: 'joselyne@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Group', color: '#F472B6' },
  { nombre: 'David Falconi', cargo: 'Graphic Designer & Animations', email: 'david@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Group', color: '#F472B6' },
  { nombre: 'Jonathan Bula', cargo: 'CRM / Full Stack Developer', email: 'jonathan@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Group', color: '#F472B6' },
  { nombre: 'Guiselle Negrete', nickname: 'Gigi', cargo: 'Patient Recruitment Coordinator', email: 'guisella@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Group', color: '#F472B6' },
  { nombre: 'Gabriel Negrete', cargo: 'Patient Recruitment Coordinator', email: 'gnegrete@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Group', color: '#7C6FF7' },
  { nombre: 'Luis Melo', cargo: 'Digital Transformation Consultant', email: 'luis@eminat.net', ubicacion: 'USA', departamento: 'Digital & AI', empresa: 'Eminat Group', color: '#A78BFA' },
  { nombre: 'Wagner Duenas', cargo: 'AI Developer', email: 'wagner@eminat.net', ubicacion: 'Ecuador', departamento: 'Digital & AI', empresa: 'Eminat Group', color: '#A78BFA' },
  { nombre: 'Giuliana Guerrero', nickname: 'Giuli', cargo: 'Operations Coordinator', email: 'giuliana@vivinegretefoundation.org', ubicacion: 'USA', credenciales: 'AASW', departamento: 'VNF', empresa: 'Vivi Negrete Foundation', color: '#FB923C' },
  { nombre: 'Felipe Beltran', cargo: 'Psychiatry', email: 'fbeltran@vivinegretefoundation.org', ubicacion: 'USA', departamento: 'VNF', empresa: 'Vivi Negrete Foundation', color: '#FB923C' },
  { nombre: 'Sara Hidalgo', cargo: 'Psychiatry', email: 'shidalgo@vivinegretefoundation.org', ubicacion: 'USA', credenciales: 'ARNP', departamento: 'VNF', empresa: 'Vivi Negrete Foundation', color: '#FB923C' },
]

export const DEPS_DIR = ['Todos', 'Leadership', 'Directors', 'Finance', 'Business Dev', 'Research', 'Marketing', 'Digital & AI', 'VNF']

export function getIniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export function getColorMarca(codigo: string) {
  return MARCAS_LIST.find(m => m.codigo === codigo)?.color || '#7C6FF7'
}

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

  // Derived values — all permissions flow from lib/permissions.ts.
  // The legacy email allowlists for cobranzas/research/medical are gone:
  // the new role model expresses the same intent (Freddy/Javier as admin
  // or medico_investigacion grants what the old allowlists did).
  const role: Role | null = normalizeRole(usuario?.rol)
  const modules: ModuleSlug[] = getModulesForRole(role)
  const esSuperAdmin = role === 'admin'
  const cargo = role
    ? ROLE_LABELS[role]
    : (usuario?.rol || 'Colaborador')
  const canCobranzas = canAccess(role, 'cobranzas')
  const canResearch = canAccess(role, 'research')
  const canMedical = canAccess(role, 'medical')

  // Theme colors — content area is always light; sidebar/topbar dark is handled in AppShell
  const bg = '#F9FAFB'
  const s1 = '#FFFFFF'
  const s2 = '#FFFFFF'
  const s3 = '#F3F4F6'
  const border = '#E5E7EB'
  const t1 = '#111827'
  const t2 = '#6B7280'
  const t3 = '#9CA3AF'
  const accent = '#7C6FF7'

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 10,
    border: '1px solid #D1D5DB',
    background: '#FFFFFF',
    color: '#111827',
    fontSize: 13,
    fontFamily: 'DM Sans',
    outline: 'none',
  }

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
        bg,
        s1,
        s2,
        s3,
        border,
        t1,
        t2,
        t3,
        accent,
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
