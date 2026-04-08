'use client'
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
  { codigo: 'MENTOR', color: '#FBB040', label: 'Mentor' },
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

export const ROLES = ['pasante', 'colaborador', 'coordinador', 'superadmin']

export const EMPRESAS = [
  'Eminat Holding',
  'Eminat Research Group',
  'Eminat Medical Center',
  'Premier by Eminat',
  'Vivi Negrete Foundation',
]

export const EMPRESA_COLORS: Record<string, string> = {
  'Eminat Holding': '#7C6FF7',
  'Eminat Research Group': '#60A5FA',
  'Eminat Medical Center': '#34D399',
  'Premier by Eminat': '#FB923C',
  'Vivi Negrete Foundation': '#F472B6',
}

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
  { nombre: 'Sandra Viviana Negrete', nickname: 'Vivi', cargo: 'CEO', email: 'ceo@eminat.net', ubicacion: 'USA', credenciales: 'MBA', departamento: 'Leadership', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Javier Andrade', nickname: 'Javi', cargo: 'COO', email: 'javier@eminat.net', ubicacion: 'USA', credenciales: 'MD, MPH', departamento: 'Leadership', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Emilio Andrade-Negrete', cargo: 'Clinical Research Regulatory Coordinator', email: 'emilioandraden@eminat.net', ubicacion: 'USA', departamento: 'Leadership', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Natalya Andrade-Negrete', cargo: 'VNF Coordinator', email: 'natalyaandraden@eminat.net', ubicacion: 'USA', departamento: 'Leadership', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Dayrelis Mesa-Sardina', nickname: 'Day', cargo: 'Director Clinical Research Operations', email: 'dmsardina@eminat.net', ubicacion: 'USA', credenciales: 'PA-C, MCMs, MPH', departamento: 'Directors', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Daniel Valderrama', nickname: 'Dani', cargo: 'Director Medical Center Operations', email: 'daniel@eminat.net', ubicacion: 'USA', departamento: 'Directors', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Norma Torres', nickname: 'Normita', cargo: 'Finance and Administrative Director', email: 'ntorres@eminat.net', ubicacion: 'USA', credenciales: 'ECON', departamento: 'Directors', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Erick Lebed', cargo: 'Business Development Director', email: 'erick@eminat.net', ubicacion: 'USA', credenciales: 'BBA', departamento: 'Directors', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Raul Hernandez', nickname: 'Coach', cargo: 'Director Digital Transformation', email: 'raul@eminat.net', ubicacion: 'USA', credenciales: 'ENG', departamento: 'Directors', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Freddy Crespin', nickname: 'Mr Freddy', cargo: 'Marketing Director', email: 'freddy@eminat.net', ubicacion: 'Ecuador', departamento: 'Directors', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'Ivannia Castrillo', nickname: 'Ivannita', cargo: 'Eminat Premier Manager', email: 'ivannia@eminat.net', ubicacion: 'USA', departamento: 'Directors', empresa: 'Premier by Eminat', color: '#FB923C' },
  { nombre: 'Maria Jose Malaguera', nickname: 'Majito', cargo: 'Accounting Lead', email: 'majo@eminat.net', ubicacion: 'Ecuador', departamento: 'Finance', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Ana Vargas', nickname: 'Anita', cargo: 'Accounting Coordinator', email: 'ana@eminat.net', ubicacion: 'Ecuador', departamento: 'Finance', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Livingsthone Andrade', cargo: 'Latin America Manager', email: 'landrade@eminat.net', ubicacion: 'Ecuador', credenciales: 'MSES', departamento: 'Finance', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Ronny Andrade', cargo: 'Head of Partnerships', email: 'randrade@eminat.net', ubicacion: 'Ecuador', credenciales: 'MBA', departamento: 'Finance', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Federico Salviche', cargo: 'Business Development Associate', email: 'federico@eminat.net', ubicacion: 'USA', departamento: 'Business Dev', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Lina Guerrero', cargo: 'Business Development Associate', email: 'lina@eminat.net', ubicacion: 'USA', departamento: 'Business Dev', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Leonardo Salazar', nickname: 'Leo', cargo: 'Senior Clinical Research Coordinator', email: 'lsalazar@eminat.net', ubicacion: 'USA', credenciales: 'MD, RMA, FMG', departamento: 'Research', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Diana Hernandez', nickname: 'Dianita', cargo: 'Senior Clinical Research Coordinator', email: 'diana@eminat.net', ubicacion: 'USA', credenciales: 'MD, RMA, FMG', departamento: 'Research', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Lisandra Cruz', nickname: 'Lissy', cargo: 'Clinical Research Coordinator', email: 'lcruz@eminat.net', ubicacion: 'USA', departamento: 'Research', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Joselyne Guerrero', nickname: 'Joss', cargo: 'Graphic Designer', email: 'joselyne@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'David Falconi', cargo: 'Graphic Designer & Animations', email: 'david@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'Jonathan Bula', cargo: 'CRM / Full Stack Developer', email: 'jonathan@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'Guiselle Negrete', nickname: 'Gigi', cargo: 'Patient Recruitment Coordinator', email: 'guisella@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'Gabriel Negrete', cargo: 'Patient Recruitment Coordinator', email: 'gnegrete@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Luis Melo', cargo: 'Digital Transformation Consultant', email: 'luis@eminat.net', ubicacion: 'USA', departamento: 'Digital & AI', empresa: 'Eminat Holding', color: '#A78BFA' },
  { nombre: 'Wagner Duenas', cargo: 'AI Developer', email: 'wagner@eminat.net', ubicacion: 'Ecuador', departamento: 'Digital & AI', empresa: 'Eminat Holding', color: '#A78BFA' },
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
  const router = useRouter()

  const [usuario, setUsuario] = useState<any>(null)
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

  // Derived values
  const esSuperAdmin = usuario?.rol === 'superadmin' || usuario?.rol === 'coordinador'
  const cargo = usuario?.rol === 'superadmin' ? 'Marketing Director' : usuario?.rol || 'Colaborador'
  const canCobranzas = esSuperAdmin || usuario?.email?.toLowerCase() === 'majo@eminat.net'
  const canResearch = esSuperAdmin || ['freddy@eminat.net', 'jonathan@eminat.net'].includes(usuario?.email?.toLowerCase() || '')

  // Theme colors
  const bg = dark ? '#0A0A0F' : '#F0F2F5'
  const s1 = dark ? '#111118' : '#FFFFFF'
  const s2 = dark ? '#1A1A24' : '#F0F0F5'
  const s3 = dark ? '#22222E' : '#E8E8F0'
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const t1 = dark ? '#FFFFFF' : '#0A0A0F'
  const t2 = dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'
  const t3 = dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
  const accent = '#7C6FF7'

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: s2,
    color: t1,
    fontSize: 13,
    fontFamily: 'DM Sans',
    outline: 'none',
  }

  const mostrarMensaje = useCallback((tipo: 'ok' | 'error', texto: string) => {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 3000)
  }, [])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  useEffect(() => {
    let heartbeatInterval: ReturnType<typeof setInterval>
    let clockInterval: ReturnType<typeof setInterval>
    let realtimeChannel: any

    async function init() {
      try {
        // 1. Get auth user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // 2. Fetch usuario from 'usuarios' table by email
        const { data: usr } = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', user.email)
          .single()

        if (!usr) {
          router.push('/login')
          return
        }
        setUsuario(usr)

        const isSuperAdmin = usr.rol === 'superadmin' || usr.rol === 'coordinador'

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
