'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const TRIMESTRES = ['General', 'Q1', 'Q2', 'Q3', 'Q4']
const MESES_Q: Record<string, string[]> = {
  General: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  Q1: ['Enero','Febrero','Marzo'],
  Q2: ['Abril','Mayo','Junio'],
  Q3: ['Julio','Agosto','Septiembre'],
  Q4: ['Octubre','Noviembre','Diciembre'],
}

const MARCAS = [
  { codigo: 'EMC', color: '#60A5FA' },
  { codigo: 'SVN', color: '#F472B6' },
  { codigo: 'ERG', color: '#A78BFA' },
  { codigo: 'VNF', color: '#FB923C' },
  { codigo: 'PREMIER', color: '#34D399' },
]

const ESTADO_COLORS: Record<string, string> = {
  'Completado': '#34D399',
  'Por aprobar': '#FBB040',
  'En proceso': '#7C6FF7',
  'Pendiente': '#9494B3',
}

const CARGOS: Record<string, string> = {
  'superadmin': 'Coordinador de Marketing',
  'coordinador': 'Coordinador',
  'colaborador': 'Colaborador Creativo',
  'pasante': 'Pasante',
  'externo': 'Externo',
}

const EMPRESA_COLORS: Record<string, string> = {
  'Eminat Holding': '#7C6FF7',
  'Eminat Research Group': '#60A5FA',
  'Eminat Medical Center': '#34D399',
  'Premier by Eminat': '#FB923C',
  'Vivi Negrete Foundation': '#F472B6',
}

interface DirectorioMiembro {
  nombre: string
  nickname?: string
  cargo: string
  email: string
  ubicacion: string
  credenciales?: string
  departamento: string
  empresa: string
  color: string
}

const DIRECTORIO: DirectorioMiembro[] = [
  { nombre: 'Sandra Viviana Negrete', nickname: 'Vivi', cargo: 'CEO', email: 'ceo@eminat.net', ubicacion: 'USA', credenciales: 'MBA', departamento: 'Leadership', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Javier Andrade', nickname: 'Javi', cargo: 'COO', email: 'javier@eminat.net', ubicacion: 'USA', credenciales: 'MD, MPH', departamento: 'Leadership', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Emilio Andrade-Negrete', nickname: 'Emi', cargo: 'Clinical Research Regulatory Coordinator', email: 'emilioandraden@eminat.net', ubicacion: 'USA', departamento: 'Leadership', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Natalya Andrade-Negrete', nickname: 'Nat', cargo: 'Vivi Negrete Foundation Coordinator', email: 'natalyaandraden@eminat.net', ubicacion: 'USA', departamento: 'Leadership', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Dayrelis Mesa-Sardina', nickname: 'Day', cargo: 'Director of Clinical Research Operations', email: 'dmsardina@eminat.net', ubicacion: 'USA', credenciales: 'PA-C, MCMs, MPH', departamento: 'Directors', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Daniel Valderrama', nickname: 'Dani', cargo: 'Director of Medical Center Operations', email: 'daniel@eminat.net', ubicacion: 'USA', departamento: 'Directors', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Norma Torres', nickname: 'Normita', cargo: 'Finance and Administrative Director', email: 'ntorres@eminat.net', ubicacion: 'USA', credenciales: 'ECON', departamento: 'Directors', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Erick Lebed', cargo: 'Business Development Director', email: 'erick@eminat.net', ubicacion: 'USA', credenciales: 'BBA', departamento: 'Directors', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Raul Hernandez', nickname: 'Coach', cargo: 'Director of Digital Transformation', email: 'raul@eminat.net', ubicacion: 'USA', credenciales: 'ENG', departamento: 'Directors', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Freddy Crespin', nickname: 'Mr Freddy', cargo: 'Marketing Director', email: 'freddy@eminat.net', ubicacion: 'Ecuador', departamento: 'Directors', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'Ivannia Castrillo', nickname: 'Ivannita', cargo: 'Eminat Premier Manager', email: 'ivannia@eminat.net', ubicacion: 'USA', departamento: 'Directors', empresa: 'Premier by Eminat', color: '#FB923C' },
  { nombre: 'Maria Jose Malaguera', nickname: 'Majito', cargo: 'Accounting and Revenue Operations Lead', email: 'majo@eminat.net', ubicacion: 'Ecuador', departamento: 'Finance', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Ana Vargas', nickname: 'Anita', cargo: 'Accounting and Revenue Operations Coordinator', email: 'ana@eminat.net', ubicacion: 'Ecuador', departamento: 'Finance', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Livingsthone Andrade', nickname: 'Livincito', cargo: 'Latin America Operations Manager', email: 'landrade@eminat.net', ubicacion: 'Ecuador', credenciales: 'MSES', departamento: 'Finance', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Ronny Andrade', nickname: 'Ronnicito', cargo: 'Head of Partnerships', email: 'randrade@eminat.net', ubicacion: 'Ecuador', credenciales: 'MBA', departamento: 'Finance', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Federico Salviche', cargo: 'Business Development Associate', email: 'federico@eminat.net', ubicacion: 'USA', departamento: 'Business Dev', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Lina Guerrero', cargo: 'Business Development Associate', email: 'lina@eminat.net', ubicacion: 'USA', departamento: 'Business Dev', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Leonardo Salazar', nickname: 'Leo', cargo: 'Senior Clinical Research Coordinator', email: 'lsalazar@eminat.net', ubicacion: 'USA', credenciales: 'MD, RMA, FMG', departamento: 'Research', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Diana Hernandez', nickname: 'Dianita', cargo: 'Senior Clinical Research Coordinator', email: 'diana@eminat.net', ubicacion: 'USA', credenciales: 'MD, RMA, FMG', departamento: 'Research', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Lisandra Cruz', nickname: 'Lissy', cargo: 'Clinical Research Coordinator', email: 'lcruz@eminat.net', ubicacion: 'USA', departamento: 'Research', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Elli Soheili', cargo: 'Board Certified Physician', email: 'esoheili@emc.health', ubicacion: 'USA', credenciales: 'MD', departamento: 'Medical', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Yelena Vidgop', cargo: 'Neurologist, Neurophysiology', email: 'yvidgop@emc.health', ubicacion: 'USA', credenciales: 'MD', departamento: 'Medical', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Natalie Zayas-Cruz', cargo: 'Cardiology - Internal Medicine', email: 'nzayas@emc.health', ubicacion: 'USA', credenciales: 'PA-C', departamento: 'Medical', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Yaneth Trujillo', cargo: 'Family Medicine Specialist', email: 'ytrujillo@emc.health', ubicacion: 'USA', credenciales: 'MD', departamento: 'Medical', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Carlos Romero', cargo: 'Family Medicine Specialist', email: 'cromero@emc.health', ubicacion: 'USA', credenciales: 'MD', departamento: 'Medical', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Mark Sabbota', cargo: 'Cardiology - Internal Medicine Specialist', email: 'msabbota@emc.health', ubicacion: 'USA', credenciales: 'MD', departamento: 'Medical', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Sergio Chacin', cargo: 'Pain Management Specialist', email: 'schacin@emc.health', ubicacion: 'USA', credenciales: 'MD', departamento: 'Medical', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Joselyne Guerrero', nickname: 'Joss', cargo: 'Graphic Designer', email: 'joselyne@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'David Falconi', cargo: 'Graphic Designer and Animations', email: 'david@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'Jonathan Bula', cargo: 'CRM Developer / Full Stack Developer', email: 'jonathan@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'Guiselle Negrete', nickname: 'Gigi', cargo: 'Patient Recruitment Coordinator', email: 'guisella@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'Gabriel Negrete', cargo: 'Patient Recruitment Coordinator', email: 'gnegrete@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'Luis Melo', cargo: 'Digital Transformation Consultant', email: 'luis@eminat.net', ubicacion: 'USA', departamento: 'Digital & AI', empresa: 'Eminat Holding', color: '#A78BFA' },
  { nombre: 'Wagner Duenas', cargo: 'AI Developer', email: 'wagner@eminat.net', ubicacion: 'Ecuador', departamento: 'Digital & AI', empresa: 'Eminat Holding', color: '#A78BFA' },
  { nombre: 'Giuliana Guerrero', nickname: 'Giuli', cargo: 'Operations Coordinator', email: 'giuliana@vivinegretefoundation.org', ubicacion: 'USA', credenciales: 'AASW', departamento: 'VNF', empresa: 'Vivi Negrete Foundation', color: '#FB923C' },
  { nombre: 'Felipe Beltran', cargo: 'Psychiatry', email: 'fbeltran@vivinegretefoundation.org', ubicacion: 'USA', departamento: 'VNF', empresa: 'Vivi Negrete Foundation', color: '#FB923C' },
  { nombre: 'Sara Hidalgo', cargo: 'Psychiatry', email: 'shidalgo@vivinegretefoundation.org', ubicacion: 'USA', credenciales: 'ARNP', departamento: 'VNF', empresa: 'Vivi Negrete Foundation', color: '#FB923C' },
]

function getIniciales(nombre: string): string {
  return nombre.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
}

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<any>(null)
  const [actividades, setActividades] = useState<any[]>([])
  const [equipo, setEquipo] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(true)
  const [trimestre, setTrimestre] = useState('General')
  const [horaActual, setHoraActual] = useState('')
  const [onlineCount, setOnlineCount] = useState(0)
  const [tab, setTab] = useState<'overview' | 'directory'>('overview')
  const [busquedaDir, setBusquedaDir] = useState('')
  const [filtroDir, setFiltroDir] = useState('Todos')
  const router = useRouter()

  const actualizarHeartbeat = useCallback(async (userId: string) => {
    await supabase.from('usuarios').update({ online_at: new Date().toISOString() }).eq('id', userId)
  }, [])

  const contarOnline = useCallback(async () => {
    const hace5min = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { count } = await supabase.from('usuarios').select('*', { count: 'exact', head: true }).gte('online_at', hace5min)
    setOnlineCount(count || 0)
  }, [])

  useEffect(() => {
    cargarDashboard()
    const reloj = setInterval(() => {
      setHoraActual(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => clearInterval(reloj)
  }, [])

  async function cargarDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: usr } = await supabase.from('usuarios').select('*').eq('email', user.email).single()
    setUsuario(usr)
    if (usr?.id) {
      await actualizarHeartbeat(usr.id)
      const heartbeat = setInterval(async () => {
        await actualizarHeartbeat(usr.id)
        await contarOnline()
      }, 30000)
      await contarOnline()
      window.addEventListener('beforeunload', () => clearInterval(heartbeat))
    }
    const { data: acts } = await supabase.from('actividades').select('*').order('fecha_entrega', { ascending: false })
    setActividades(acts || [])
    const { data: team } = await supabase.from('v_equipo_hoy').select('*')
    setEquipo(team || [])
    const { data: usrs } = await supabase.from('usuarios').select('*').eq('activo', true)
    setUsuarios(usrs || [])
    setLoading(false)
  }

  async function handleLogout() {
    if (usuario?.id && usuario?.marca_hora) {
      await supabase.rpc('registrar_salida', { p_usuario_id: usuario.id })
    }
    await supabase.auth.signOut()
    router.push('/')
  }

  const mesesQ = MESES_Q[trimestre]
  const actsFiltradas = trimestre === 'General' ? actividades : actividades.filter(a => mesesQ.includes(a.mes))
  const totalQ = actsFiltradas.length
  const completadasQ = actsFiltradas.filter(a => a.estado === 'Completado').length
  const enProcesoQ = actsFiltradas.filter(a => a.estado === 'En proceso').length
  const pendientesQ = actsFiltradas.filter(a => a.estado === 'Pendiente').length
  const pctCompletado = totalQ > 0 ? Math.round((completadasQ / totalQ) * 100) : 0
  const totalHoras = actsFiltradas.reduce((acc, a) => acc + (Number(a.horas) || 0), 0)
  const totalDias = actsFiltradas.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0)

  const mesesGrafico = trimestre === 'General'
    ? ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    : mesesQ.map(m => m.slice(0, 3))
  const mesesFull = trimestre === 'General' ? MESES_Q['General'] : mesesQ
  const datosPorMes = mesesFull.map((mes, i) => ({
    mes: mesesGrafico[i],
    total: actividades.filter(a => a.mes === mes).length,
    completadas: actividades.filter(a => a.mes === mes && a.estado === 'Completado').length,
  }))
  const maxTotal = Math.max(...datosPorMes.map(d => d.total), 1)

  const datosPorMarca = MARCAS.map(m => ({
    ...m,
    total: actsFiltradas.filter(a => a.area_ref === m.codigo).length,
    completadas: actsFiltradas.filter(a => a.area_ref === m.codigo && a.estado === 'Completado').length,
  })).filter(m => m.total > 0)
  const maxMarca = Math.max(...datosPorMarca.map(d => d.total), 1)

  const datosPorMiembro = ['DG_Joselyn','DGA_David','Jonathan_CRM','DG_Ariana','CM_ Naomi','EV_Bryan','Coord_MFreddy'].map(ref => ({
    ref,
    nombre: ref.replace('DG_','').replace('DGA_','').replace('_CRM','').replace('CM_ ','').replace('EV_','').replace('Coord_M',''),
    total: actsFiltradas.filter(a => a.responsable_ref === ref).length,
    completadas: actsFiltradas.filter(a => a.responsable_ref === ref && a.estado === 'Completado').length,
    horas: actsFiltradas.filter(a => a.responsable_ref === ref).reduce((acc, a) => acc + (Number(a.horas) || 0), 0),
  })).filter(d => d.total > 0).sort((a, b) => b.total - a.total)
  const maxMiembro = Math.max(...datosPorMiembro.map(d => d.total), 1)

  const hoy = new Date()
  const diasRestantes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate() - hoy.getDate()
  const horasDisponibles = diasRestantes * 8
  const equipoSinMi = equipo.filter(u => u.nombre !== usuario?.nombre)

  // Directorio filtrado
  const DEPS_DIR = ['Todos', 'Leadership', 'Directors', 'Finance', 'Business Dev', 'Research', 'Medical', 'Marketing', 'Digital & AI', 'VNF']
  const dirFiltrado = DIRECTORIO
    .filter(m => filtroDir === 'Todos' || m.departamento === filtroDir)
    .filter(m => busquedaDir === '' ||
      m.nombre.toLowerCase().includes(busquedaDir.toLowerCase()) ||
      m.cargo.toLowerCase().includes(busquedaDir.toLowerCase()) ||
      m.email.toLowerCase().includes(busquedaDir.toLowerCase())
    )

  const bg = dark ? '#0A0A0F' : '#F5F5F7'
  const s1 = dark ? '#111118' : '#FFFFFF'
  const s2 = dark ? '#1A1A24' : '#F0F0F5'
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const t1 = dark ? '#FFFFFF' : '#0A0A0F'
  const t2 = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'
  const t3 = dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'
  const accent = '#7C6FF7'
  const cargo = CARGOS[usuario?.rol] || usuario?.rol || 'Colaborador'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{ fontSize: 14, color: t3 }}>Cargando...</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: bg, color: t1, fontFamily: 'DM Sans, sans-serif', transition: 'background .3s, color .3s' }}>

      {/* SIDEBAR */}
      <aside style={{ width: 220, background: s1, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: t1 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, boxShadow: `0 0 10px ${accent}` }} />
            eminat app
          </div>
        </div>

        <nav style={{ padding: '10px 7px', overflowY: 'auto', flex: 1 }}>
          {[
            { icon: '🏠', label: 'Dashboard', href: '/dashboard', active: true },
            { icon: '📋', label: 'Solicitudes', href: '/solicitudes' },
            { icon: '📅', label: 'Calendario', href: '/calendario' },
            { icon: '👥', label: 'Equipo', href: '/equipo' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 10, fontSize: 13, fontWeight: 500, textDecoration: 'none', color: item.active ? accent : t2, background: item.active ? `${accent}18` : 'transparent', marginBottom: 1 }}>
              <span>{item.icon}</span>{item.label}
            </Link>
          ))}

          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.1em', padding: '12px 8px 5px' }}>Reportes</div>
          {[
            { icon: '⚡', label: 'Produccion', href: '/produccion' },
            { icon: '⏱', label: 'Horas', href: '/horas' },
            { icon: '💰', label: 'Pagos', href: '/pagos' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 10, fontSize: 13, fontWeight: 500, textDecoration: 'none', color: t2, marginBottom: 1 }}>
              <span>{item.icon}</span>{item.label}
            </Link>
          ))}

          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.1em', padding: '12px 8px 5px' }}>Marcas</div>
          {MARCAS.map(a => (
            <div key={a.codigo} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 10, fontSize: 13, color: t2, cursor: 'pointer', marginBottom: 1 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: a.color }} />
              {a.codigo}
            </div>
          ))}

          {/* TARJETA USUARIO */}
          <div style={{ margin: '12px 4px 0', padding: '12px', borderRadius: 12, background: `${accent}10`, border: `1px solid ${accent}25` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: usuario?.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
                  {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#34D399', border: `2px solid ${s1}` }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.nombre} {usuario?.apellido}</div>
                <div style={{ fontSize: 10, color: accent, fontWeight: 500 }}>{cargo}</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: t3, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>📍</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.ubicacion || 'Guayaquil, Ecuador'}</span>
            </div>
            <button onClick={handleLogout} style={{ width: '100%', padding: '6px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t3, fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans' }}>
              ↩ Sign out
            </button>
          </div>
        </nav>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* TOPBAR */}
        <div style={{ padding: '12px 24px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: s1, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: t1 }}>Buen dia, {usuario?.nombre} 👋</div>
            <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', marginTop: 1 }}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {horaActual}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: '#34D39915', border: '1px solid #34D39940' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
              <span style={{ fontSize: 11, color: '#34D399', fontWeight: 500 }}>{onlineCount > 0 ? onlineCount : 1} online</span>
            </div>
            <button onClick={() => setDark(!dark)} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
              {dark ? '☀️ Light' : '🌙 Dark'}
            </button>
            {(usuario?.rol === 'superadmin' || usuario?.rol === 'coordinador') && (
              <Link href="/admin" style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(248,113,113,.3)', background: 'rgba(248,113,113,.08)', color: '#F87171', fontSize: 11, fontWeight: 500, textDecoration: 'none' }}>🔐 Admin</Link>
            )}
            <Link href="/solicitar" style={{ padding: '6px 14px', borderRadius: 10, background: accent, color: 'white', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>+ Nueva solicitud</Link>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 4, padding: '14px 24px 0', borderBottom: `1px solid ${border}`, background: s1 }}>
          {[
            { key: 'overview', label: '📊 Overview' },
            { key: 'directory', label: '🏢 Directory' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as 'overview' | 'directory')}
              style={{
                padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans',
                background: tab === t.key ? bg : 'transparent',
                color: tab === t.key ? t1 : t3,
                borderBottom: tab === t.key ? `2px solid ${accent}` : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '18px 24px', flex: 1 }}>

          {/* ======== TAB OVERVIEW ======== */}
          {tab === 'overview' && (
            <div>
              {/* TRIMESTRE */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 16, alignItems: 'center' }}>
                {TRIMESTRES.map(q => (
                  <button key={q} onClick={() => setTrimestre(q)} style={{
                    padding: '5px 16px', borderRadius: 20, border: `1px solid ${trimestre === q ? accent : border}`,
                    background: trimestre === q ? accent : 'transparent',
                    color: trimestre === q ? 'white' : t2,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .2s'
                  }}>{q}</button>
                ))}
                <span style={{ marginLeft: 8, fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>
                  {trimestre !== 'General' ? mesesQ.join(' · ') : 'Enero - Diciembre 2026'}
                </span>
              </div>

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 14 }}>
                {[
                  { label: 'Total Tareas', value: totalQ, color: accent, sub: 'actividades' },
                  { label: 'Completadas', value: completadasQ, color: '#34D399', sub: `${pctCompletado}% efectividad` },
                  { label: 'En Proceso', value: enProcesoQ, color: '#FBB040', sub: 'en curso' },
                  { label: 'Pendientes', value: pendientesQ, color: '#9494B3', sub: 'sin iniciar' },
                  { label: 'Horas Totales', value: `${totalHoras}h`, color: '#F472B6', sub: `${totalDias} dias prod.` },
                  { label: 'Horas Libres', value: `${horasDisponibles}h`, color: '#60A5FA', sub: `${diasRestantes} dias restantes` },
                ].map(k => (
                  <div key={k.label} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ fontSize: 9, color: t3, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8, fontFamily: 'DM Mono' }}>{k.label}</div>
                    <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, lineHeight: 1, color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 9, color: t3, marginTop: 6 }}>{k.sub}</div>
                    <div style={{ marginTop: 8, height: 2, borderRadius: 1, background: border }}>
                      <div style={{ height: 2, borderRadius: 1, background: k.color, width: `${pctCompletado}%`, transition: 'width .5s' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* GRAFICOS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: 12, marginBottom: 14 }}>
                {/* Por mes */}
                <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 4 }}>Produccion por mes</div>
                  <div style={{ fontSize: 10, color: t3, marginBottom: 12 }}>{trimestre}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 90 }}>
                    {datosPorMes.map(d => (
                      <div key={d.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ fontSize: 8, color: t3, fontFamily: 'DM Mono' }}>{d.total}</div>
                        <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 66 }}>
                          <div style={{ flex: 1, background: `${accent}25`, borderRadius: '3px 3px 0 0', height: `${(d.total / maxTotal) * 100}%`, minHeight: d.total > 0 ? 3 : 0 }} />
                          <div style={{ flex: 1, background: '#34D399', borderRadius: '3px 3px 0 0', height: `${(d.completadas / maxTotal) * 100}%`, minHeight: d.completadas > 0 ? 3 : 0 }} />
                        </div>
                        <div style={{ fontSize: 9, color: t3 }}>{d.mes}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: t3 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: `${accent}25` }} /> Total
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: t3 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: '#34D399' }} /> Completadas
                    </div>
                  </div>
                </div>

                {/* Por marca */}
                <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 4 }}>Por marca</div>
                  <div style={{ fontSize: 10, color: t3, marginBottom: 12 }}>{trimestre}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {datosPorMarca.map(m => (
                      <div key={m.codigo} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: t2, width: 52, flexShrink: 0 }}>{m.codigo}</span>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: border, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: m.color, width: `${(m.total / maxMarca) * 100}%`, transition: 'width .5s' }} />
                        </div>
                        <span style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', width: 28, textAlign: 'right' }}>{m.total}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 12 }}>
                    {[
                      { label: 'Completed', value: pctCompletado, color: '#34D399' },
                      { label: 'In Progress', value: totalQ > 0 ? Math.round((enProcesoQ / totalQ) * 100) : 0, color: accent },
                      { label: 'Pending', value: totalQ > 0 ? Math.round((pendientesQ / totalQ) * 100) : 0, color: '#9494B3' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne', color: s.color }}>{s.value}%</div>
                        <div style={{ fontSize: 9, color: t3 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Marketing Today */}
                <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Marketing Today</div>
                      <div style={{ fontSize: 9, color: t3, marginTop: 1 }}>Active team members</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#34D399' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
                      {onlineCount > 0 ? onlineCount : 1} online
                    </div>
                  </div>
                  <div style={{ overflowY: 'auto', maxHeight: 220 }}>
                    {equipoSinMi.map(u => {
                      const userInfo = usuarios.find(us => us.nombre === u.nombre)
                      const isOnline = userInfo?.online_at
                        ? new Date(userInfo.online_at) > new Date(Date.now() - 5 * 60 * 1000)
                        : u.estado_hoy === 'presente'
                      return (
                        <div key={u.id} style={{ padding: '9px 14px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
                              {u.nombre?.[0]}{u.apellido?.[0]}
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: isOnline ? '#34D399' : '#9494B3', border: `2px solid ${s1}` }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: t1 }}>{u.nombre}</div>
                            <div style={{ fontSize: 9, color: t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {userInfo?.ubicacion || 'Guayaquil, Ecuador'}
                            </div>
                            <div style={{ fontSize: 9, color: isOnline ? '#34D399' : t3 }}>
                              {isOnline ? '● Active now' : u.estado_hoy === 'presente' ? `In: ${u.hora_entrada?.slice(11, 16)}` : u.estado_hoy === 'sin_marcacion' ? 'Intern' : 'Offline'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* ACTIVIDADES + RANKING */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
                <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Actividades recientes</div>
                      <div style={{ fontSize: 9, color: t3, marginTop: 1 }}>{trimestre}</div>
                    </div>
                    <Link href="/solicitudes" style={{ fontSize: 10, color: accent, textDecoration: 'none', fontWeight: 500 }}>Ver todas →</Link>
                  </div>
                  {actsFiltradas.slice(0, 7).map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${border}` }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: ESTADO_COLORS[a.estado] || t3, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titulo}</div>
                        <div style={{ fontSize: 9, color: t3, marginTop: 1 }}>{a.area_ref} · {a.responsable_ref} · {a.mes}</div>
                      </div>
                      <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 9, fontFamily: 'DM Mono', background: `${ESTADO_COLORS[a.estado] || t3}20`, color: ESTADO_COLORS[a.estado] || t3, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {a.estado}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}` }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Tareas por miembro</div>
                    <div style={{ fontSize: 9, color: t3, marginTop: 1 }}>{trimestre}</div>
                  </div>
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {datosPorMiembro.map((m, i) => (
                      <div key={m.ref}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 9, color: t3, fontFamily: 'DM Mono', width: 12 }}>{i + 1}</span>
                            <span style={{ fontSize: 11, color: t1, fontWeight: 500 }}>{m.nombre}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 9, color: '#34D399', fontFamily: 'DM Mono' }}>{m.completadas}✓</span>
                            <span style={{ fontSize: 9, color: t3, fontFamily: 'DM Mono' }}>{m.horas}h</span>
                          </div>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: border, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: accent, width: `${(m.total / maxMiembro) * 100}%`, transition: 'width .5s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======== TAB DIRECTORY ======== */}
          {tab === 'directory' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: t1, fontFamily: 'Syne' }}>Eminat Holding Directory</div>
                  <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>{DIRECTORIO.length} members across all companies</div>
                </div>
                <input
                  type="text"
                  placeholder="Search by name, role or email..."
                  value={busquedaDir}
                  onChange={e => setBusquedaDir(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${border}`, background: s1, color: t1, fontSize: 12, outline: 'none', width: 260, fontFamily: 'DM Sans' }}
                />
              </div>

              {/* Filtros departamento */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {DEPS_DIR.map(dep => (
                  <button
                    key={dep}
                    onClick={() => setFiltroDir(dep)}
                    style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans',
                      border: `1px solid ${filtroDir === dep ? accent : border}`,
                      background: filtroDir === dep ? accent : 'transparent',
                      color: filtroDir === dep ? 'white' : t2,
                    }}
                  >
                    {dep}
                    {dep !== 'Todos' && (
                      <span style={{ marginLeft: 4, opacity: .6, fontSize: 10 }}>{DIRECTORIO.filter(m => m.departamento === dep).length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {dirFiltrado.map((m, i) => {
                  const empresaColor = EMPRESA_COLORS[m.empresa] || '#7C6FF7'
                  return (
                    <div key={i} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px', transition: 'all .2s' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {getIniciales(m.nombre)}
                        </div>
                        <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: `${empresaColor}20`, color: empresaColor, fontWeight: 600 }}>
                          {m.empresa.replace('Eminat ', '').replace(' by Eminat', '')}
                        </span>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: t1 }}>
                          {m.nombre}
                          {m.credenciales && <span style={{ fontSize: 9, color: t3, fontWeight: 400, marginLeft: 4 }}>{m.credenciales}</span>}
                        </div>
                        {m.nickname && <div style={{ fontSize: 10, color: t3, marginTop: 1 }}>"{m.nickname}"</div>}
                        <div style={{ fontSize: 11, color: t2, marginTop: 4 }}>{m.cargo}</div>
                      </div>
                      <div style={{ borderTop: `1px solid ${border}`, paddingTop: 8 }}>
                        <a href={`mailto:${m.email}`} style={{ fontSize: 10, color: accent, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ✉ {m.email}
                        </a>
                        <div style={{ fontSize: 10, color: t3, marginTop: 3 }}>
                          {m.ubicacion === 'USA' ? 'US' : 'EC'} {m.ubicacion}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {dirFiltrado.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: t3 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                  <div>No members found.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
