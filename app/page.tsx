'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const TRIMESTRES = ['General', 'Q1', 'Q2', 'Q3', 'Q4']
const MESES_Q: Record<string, string[]> = {
  General: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  Q1: ['Enero','Febrero','Marzo'],
  Q2: ['Abril','Mayo','Junio'],
  Q3: ['Julio','Agosto','Septiembre'],
  Q4: ['Octubre','Noviembre','Diciembre'],
}
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function mesATrimestre(mes: string): string {
  if (['Enero','Febrero','Marzo'].includes(mes)) return 'Q1'
  if (['Abril','Mayo','Junio'].includes(mes)) return 'Q2'
  if (['Julio','Agosto','Septiembre'].includes(mes)) return 'Q3'
  return 'Q4'
}

const MARCAS_LIST = [
  { codigo: 'EMC', color: '#60A5FA', label: 'Medical Center' },
  { codigo: 'SVN', color: '#F472B6', label: 'Soy Vivi Negrete' },
  { codigo: 'ERG', color: '#A78BFA', label: 'Research Group' },
  { codigo: 'VNF', color: '#FB923C', label: 'VN Foundation' },
  { codigo: 'PREMIER', color: '#34D399', label: 'Premier' },
  { codigo: 'ORNELLA', color: '#F87171', label: 'Ornella IA' },
  { codigo: 'MENTOR', color: '#FBB040', label: 'Mentor' },
]

const ESTADO_COLORS: Record<string, string> = {
  'Completado': '#34D399',
  'Por aprobar': '#FBB040',
  'En proceso': '#7C6FF7',
  'Pendiente': '#9494B3',
}

const COLUMNAS_KANBAN = ['Pendiente', 'En proceso', 'Por aprobar', 'Completado']

const MIEMBROS_REFS: Record<string, string> = {
  'DG_Joselyn': 'Joselyn',
  'DGA_David': 'David',
  'Jonathan_CRM': 'Jonathan',
  'DG_Ariana': 'Ariana',
  'CM_ Naomi': 'Naomi',
  'EV_Bryan': 'Bryan',
  'Coord_MFreddy': 'Freddy',
}

const SOLICITANTES = [
  { value: 'Coord_MFreddy', label: 'Freddy Crespin — Marketing Director' },
  { value: 'Rafaella', label: 'Rafaella' },
  { value: 'CEO_Vivi', label: 'Vivi Negrete — CEO' },
  { value: 'COO_Javier', label: 'Javier Andrade — COO' },
  { value: 'EMC', label: 'EMC — Medical Center' },
  { value: 'ERG', label: 'ERG — Research Group' },
  { value: 'SVN', label: 'SVN — Soy Vivi Negrete' },
  { value: 'VNF', label: 'VNF — Foundation' },
  { value: 'PREMIER', label: 'PREMIER — Premier' },
]

const COLORES_AVATAR = ['#7C6FF7', '#34D399', '#F472B6', '#60A5FA', '#FB923C', '#FBB040', '#A78BFA', '#F87171']
const ROLES = ['pasante', 'colaborador', 'coordinador', 'superadmin']
const EMPRESAS = ['Eminat Holding', 'Eminat Research Group', 'Eminat Medical Center', 'Premier by Eminat', 'Vivi Negrete Foundation']

const EMPRESA_COLORS: Record<string, string> = {
  'Eminat Holding': '#7C6FF7',
  'Eminat Research Group': '#60A5FA',
  'Eminat Medical Center': '#34D399',
  'Premier by Eminat': '#FB923C',
  'Vivi Negrete Foundation': '#F472B6',
}

const CARGOS_DIR: Record<string, string> = {
  'freddy@eminat.net': 'Marketing Director',
  'joselyne@eminat.net': 'Graphic Designer',
  'david@eminat.net': 'Graphic Designer & Animations',
  'jonathan@eminat.net': 'CRM Developer / Full Stack',
  'ariana@eminat.net': 'Graphic Designer (Pasante)',
  'naomi@eminat.net': 'Community Manager (Pasante)',
  'bryan@eminat.net': 'Video Editor (Pasante)',
  'javier@emc.health': 'COO / Medical Director',
  'ceo@eminat.net': 'CEO',
  'javier@eminat.net': 'COO',
  'dmsardina@eminat.net': 'Director Clinical Research',
  'ntorres@eminat.net': 'Finance & Admin Director',
  'erick@eminat.net': 'Business Development Director',
  'raul@eminat.net': 'Director Digital Transformation',
  'ivannia@eminat.net': 'Premier Manager',
}

const DIRECTORIO_DATA = [
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
  { nombre: 'Gabriel Negrete', cargo: 'Patient Recruitment Coordinator', email: 'gnegrete@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'Luis Melo', cargo: 'Digital Transformation Consultant', email: 'luis@eminat.net', ubicacion: 'USA', departamento: 'Digital & AI', empresa: 'Eminat Holding', color: '#A78BFA' },
  { nombre: 'Wagner Duenas', cargo: 'AI Developer', email: 'wagner@eminat.net', ubicacion: 'Ecuador', departamento: 'Digital & AI', empresa: 'Eminat Holding', color: '#A78BFA' },
  { nombre: 'Giuliana Guerrero', nickname: 'Giuli', cargo: 'Operations Coordinator', email: 'giuliana@vivinegretefoundation.org', ubicacion: 'USA', credenciales: 'AASW', departamento: 'VNF', empresa: 'Vivi Negrete Foundation', color: '#FB923C' },
  { nombre: 'Felipe Beltran', cargo: 'Psychiatry', email: 'fbeltran@vivinegretefoundation.org', ubicacion: 'USA', departamento: 'VNF', empresa: 'Vivi Negrete Foundation', color: '#FB923C' },
  { nombre: 'Sara Hidalgo', cargo: 'Psychiatry', email: 'shidalgo@vivinegretefoundation.org', ubicacion: 'USA', credenciales: 'ARNP', departamento: 'VNF', empresa: 'Vivi Negrete Foundation', color: '#FB923C' },
]

const DEPS_DIR = ['Todos','Leadership','Directors','Finance','Business Dev','Research','Marketing','Digital & AI','VNF']

function getIniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
}

function getColorMarca(codigo: string) {
  return MARCAS_LIST.find(m => m.codigo === codigo)?.color || '#7C6FF7'
}

export default function App() {
  const [usuario, setUsuario] = useState<any>(null)
  const [actividades, setActividades] = useState<any[]>([])
  const [equipo, setEquipo] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(true)
  const [vista, setVista] = useState('dashboard')
  const [subVista, setSubVista] = useState('overview')
  const [onlineCount, setOnlineCount] = useState(0)
  const [horaActual, setHoraActual] = useState('')
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState<Record<string, boolean>>({ mkt: true })
  const [sidebarPanel, setSidebarPanel] = useState<string | null>('mkt')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null)
  const [notificaciones, setNotificaciones] = useState<any[]>([])
  const [notifAbiertas, setNotifAbiertas] = useState(false)
  const router = useRouter()

  const [trimestre, setTrimestre] = useState('General')
  const [mktTab, setMktTab] = useState('kanban')
  const [mesKanban, setMesKanban] = useState('')
  const [ganttVista, setGanttVista] = useState('Mes')
  const [mesHoras, setMesHoras] = useState('')
  const [mesReporte, setMesReporte] = useState(MESES[new Date().getMonth()])
  const [miembroReporte, setMiembroReporte] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [modalNuevaAct, setModalNuevaAct] = useState(false)
  const [modalVerAct, setModalVerAct] = useState<any>(null)
  const [creandoAct, setCreandoAct] = useState(false)
  const [nuevaAct, setNuevaAct] = useState({
    titulo: '', descripcion: '', area_ref: 'EMC', responsable_ref: 'DG_Joselyn',
    mes: MESES[new Date().getMonth()], horas: '', dias_produccion: '',
    estado: 'Pendiente', fecha_entrega: '', solicitado_por: 'Coord_MFreddy', drive_url: '',
  })

  const [busquedaSol, setBusquedaSol] = useState('')
  const [filtroEstadoSol, setFiltroEstadoSol] = useState('Todos')
  const [solTab, setSolTab] = useState('lista')

  const [busquedaDir, setBusquedaDir] = useState('')
  const [filtroDir, setFiltroDir] = useState('Todos')

  const [adminUsuarios, setAdminUsuarios] = useState<any[]>([])
  const [modalCrear, setModalCrear] = useState(false)
  const [modalEditar, setModalEditar] = useState<any>(null)
  const [modalEliminar, setModalEliminar] = useState<string | null>(null)
  const [busquedaAdmin, setBusquedaAdmin] = useState('')
  const [filtroRolAdmin, setFiltroRolAdmin] = useState('todos')
  const [guardandoAdmin, setGuardandoAdmin] = useState(false)
  const [nuevoUsr, setNuevoUsr] = useState({ nombre: '', apellido: '', email: '', password: '', rol: 'pasante', tipo: 'B', color: '#7C6FF7', empresa: 'Eminat Holding' })

  const actualizarHeartbeat = useCallback(async (userId: string) => {
    await supabase.from('usuarios').update({ online_at: new Date().toISOString() }).eq('id', userId)
  }, [])

  const contarOnline = useCallback(async () => {
    const hace5min = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { count } = await supabase.from('usuarios').select('*', { count: 'exact', head: true }).gte('online_at', hace5min)
    setOnlineCount(count || 0)
  }, [])

  useEffect(() => {
    cargar()
    const reloj = setInterval(() => {
      setHoraActual(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => clearInterval(reloj)
  }, [])

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: usr } = await supabase.from('usuarios').select('*').eq('email', user.email).single()
    setUsuario(usr)
    if (usr?.id) {
      await actualizarHeartbeat(usr.id)
      const hb = setInterval(async () => { await actualizarHeartbeat(usr.id); await contarOnline() }, 30000)
      await contarOnline()
      window.addEventListener('beforeunload', () => clearInterval(hb))
      const { data: notifs } = await supabase.from('notificaciones').select('*').eq('usuario_id', usr.id).order('created_at', { ascending: false }).limit(20)
      setNotificaciones(notifs || [])
      supabase.removeChannel(supabase.channel('notif-channel'))
      supabase.channel('notif-channel').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${usr.id}` }, payload => {
        console.log('[DEBUG realtime notif]', payload.new)
        setNotificaciones(prev => [payload.new as any, ...prev])
      }).subscribe((status: string) => { console.log('[DEBUG notif-channel status]', status) })
    }
    const esSA = usr?.rol === 'superadmin' || usr?.rol === 'coordinador'
    let q = supabase.from('actividades').select('*').order('created_at', { ascending: false })
    if (!esSA && usr?.responsable_ref) q = q.eq('responsable_ref', usr.responsable_ref)
    const { data: acts } = await q
    setActividades(acts || [])
    const { data: team } = await supabase.from('v_equipo_hoy').select('*')
    setEquipo(team || [])
    const { data: usrs } = await supabase.from('usuarios').select('*').eq('activo', true)
    setUsuarios(usrs || [])
    if (!esSA && usr?.responsable_ref) setMiembroReporte(usr.responsable_ref)
    const { data: adminUsrs } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false })
    setAdminUsuarios((adminUsrs || []).map(u => ({ ...u, cargo: u.cargo || CARGOS_DIR[u.email?.toLowerCase()] || '' })))
    setLoading(false)
  }

  function mostrarMensaje(tipo: 'ok' | 'error', texto: string) {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 3000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const bg = dark ? '#0A0A0F' : '#F0F2F5'
  const s1 = dark ? '#111118' : '#FFFFFF'
  const s2 = dark ? '#1A1A24' : '#F0F0F5'
  const s3 = dark ? '#22222E' : '#E8E8F0'
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const t1 = dark ? '#FFFFFF' : '#0A0A0F'
  const t2 = dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'
  const t3 = dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
  const accent = '#7C6FF7'
  const esSuperAdmin = usuario?.rol === 'superadmin' || usuario?.rol === 'coordinador'
  const cargo = usuario?.rol === 'superadmin' ? 'Marketing Director' : usuario?.rol || 'Colaborador'

  const inputStyle: React.CSSProperties = {
    padding: '9px 12px', borderRadius: 10, border: `1px solid ${border}`,
    background: s2, color: t1, fontSize: 13, fontFamily: 'DM Sans', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }

  const mesesQ = MESES_Q[trimestre]
  const actsFiltradas = trimestre === 'General' ? actividades : actividades.filter(a => mesesQ.includes(a.mes))
  const totalQ = actsFiltradas.length
  const completadasQ = actsFiltradas.filter(a => a.estado === 'Completado').length
  const enProcesoQ = actsFiltradas.filter(a => a.estado === 'En proceso').length
  const pendientesQ = actsFiltradas.filter(a => a.estado === 'Pendiente').length
  const pctCompletado = totalQ > 0 ? Math.round((completadasQ / totalQ) * 100) : 0
  const totalHoras = Math.round(actsFiltradas.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10
  const totalDias = actsFiltradas.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0)
  const hoy = new Date()
  const diasRestantes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate() - hoy.getDate()
  const horasDisponibles = diasRestantes * 8
  const equipoSinMi = equipo.filter(u => u.nombre !== usuario?.nombre)
  const mesesFull = trimestre === 'General' ? MESES_Q['General'] : mesesQ
  const mesesGraf = trimestre === 'General' ? ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'] : mesesQ.map(m => m.slice(0, 3))
  const datosPorMes = mesesFull.map((mes, i) => ({
    mes: mesesGraf[i],
    total: actividades.filter(a => a.mes === mes).length,
    completadas: actividades.filter(a => a.mes === mes && a.estado === 'Completado').length,
  }))
  const maxTotal = Math.max(...datosPorMes.map(d => d.total), 1)
  const datosPorMarca = MARCAS_LIST.map(m => ({ ...m, total: actsFiltradas.filter(a => a.area_ref === m.codigo).length })).filter(m => m.total > 0)
  const maxMarca = Math.max(...datosPorMarca.map(d => d.total), 1)
  const refsTeam = esSuperAdmin ? Object.keys(MIEMBROS_REFS) : [usuario?.responsable_ref].filter(Boolean)
  const datosPorMiembro = refsTeam.map(ref => ({
    ref, nombre: MIEMBROS_REFS[ref] || ref,
    total: actsFiltradas.filter(a => a.responsable_ref === ref).length,
    completadas: actsFiltradas.filter(a => a.responsable_ref === ref && a.estado === 'Completado').length,
    horas: Math.round(actsFiltradas.filter(a => a.responsable_ref === ref).reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10,
  })).filter(d => d.total > 0).sort((a, b) => b.total - a.total)
  const maxMiembro = Math.max(...datosPorMiembro.map(d => d.total), 1)

  const mesesDisponibles = actividades.map(a => a.mes).filter(Boolean).filter((m, i, arr) => arr.indexOf(m) === i)
  const actsKanban = mesKanban ? actividades.filter(a => a.mes === mesKanban) : actividades
  const porColumna = (col: string) => actsKanban.filter(a => a.estado === col)

  const actsHoras = mesHoras ? actividades.filter(a => a.mes === mesHoras) : actividades
  const resumenHoras = refsTeam.map(ref => {
    const acts = actsHoras.filter(a => a.responsable_ref === ref)
    return { ref, nombre: MIEMBROS_REFS[ref] || ref, total: acts.length, completadas: acts.filter(a => a.estado === 'Completado').length, horas: Math.round(acts.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10, dias: acts.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0) }
  }).filter(r => r.total > 0)

  const refRep = miembroReporte || refsTeam[0] || ''
  const actsRep = actividades.filter(a => {
    if (!mesReporte) return a.responsable_ref === refRep || (refRep === 'Coord_MFreddy' && a.solicitado_por === refRep)
    const matchMes = a.mes === mesReporte
    if (refRep === 'Coord_MFreddy') return matchMes && (a.responsable_ref === refRep || a.solicitado_por === refRep)
    return matchMes && a.responsable_ref === refRep
  })
  const totalHorasRep = Math.round(actsRep.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10
  const totalDiasRep = actsRep.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0)
  const completadasRep = actsRep.filter(a => a.estado === 'Completado').length
  const nombreRep = MIEMBROS_REFS[refRep] || usuario?.nombre || refRep

  const dirFiltrado = DIRECTORIO_DATA
    .filter(m => filtroDir === 'Todos' || m.departamento === filtroDir)
    .filter(m => busquedaDir === '' || m.nombre.toLowerCase().includes(busquedaDir.toLowerCase()) || m.cargo.toLowerCase().includes(busquedaDir.toLowerCase()) || m.email.toLowerCase().includes(busquedaDir.toLowerCase()))

  const adminFiltrado = adminUsuarios
    .filter(u => filtroRolAdmin === 'todos' || u.rol === filtroRolAdmin)
    .filter(u => busquedaAdmin === '' || `${u.nombre} ${u.apellido}`.toLowerCase().includes(busquedaAdmin.toLowerCase()) || u.email?.toLowerCase().includes(busquedaAdmin.toLowerCase()))

  function onDragStart(id: string) { setDragId(id) }
  function onDragOverCol(col: string) { setDragOver(col) }
  function onDragEnd() { setDragId(null); setDragOver(null) }

  async function onDrop(col: string) {
    if (!dragId) return
    const act = actividades.find(a => a.id === dragId)
    if (!act || act.estado === col) { setDragId(null); setDragOver(null); return }
    const { error } = await supabase.from('actividades').update({ estado: col }).eq('id', dragId)
    if (!error) {
      setActividades(prev => prev.map(a => a.id === dragId ? { ...a, estado: col } : a))
      mostrarMensaje('ok', `Movido a "${col}"`)
    }
    setDragId(null)
    setDragOver(null)
  }

  async function crearActividad() {
    if (!nuevaAct.titulo.trim()) { mostrarMensaje('error', 'El titulo es obligatorio'); return }
    setCreandoAct(true)
    try {
      const payload: any = {
        titulo: nuevaAct.titulo.trim(),
        area_ref: nuevaAct.area_ref,
        responsable_ref: nuevaAct.responsable_ref,
        mes: nuevaAct.mes,
        trimestre: mesATrimestre(nuevaAct.mes),
        estado: nuevaAct.estado,
        solicitado_por: nuevaAct.solicitado_por,
      }
      if (nuevaAct.descripcion) payload.descripcion = nuevaAct.descripcion
      if (nuevaAct.horas) payload.horas = Number(nuevaAct.horas)
      if (nuevaAct.dias_produccion) payload.dias_produccion = Number(nuevaAct.dias_produccion)
      if (nuevaAct.fecha_entrega) payload.fecha_entrega = nuevaAct.fecha_entrega
      if (nuevaAct.drive_url) payload.drive_url = nuevaAct.drive_url

      const { data, error } = await supabase.from('actividades').insert(payload).select().single()
      if (error) { mostrarMensaje('error', `Error: ${error.message}`); setCreandoAct(false); return }

      setActividades(prev => [data, ...prev])

      if (data && nuevaAct.responsable_ref !== usuario?.responsable_ref) {
        console.log('[DEBUG notif]', { responsable_ref: nuevaAct.responsable_ref, usuarios_length: usuarios.length, found: usuarios.find((u: any) => u.responsable_ref === nuevaAct.responsable_ref) })
        const responsableUser = usuarios.find((u: any) => u.responsable_ref === nuevaAct.responsable_ref)
        if (responsableUser?.id) {
          await supabase.from('notificaciones').insert({ usuario_id: responsableUser.id, tipo: 'tarea_asignada', titulo: 'Nueva tarea asignada', mensaje: `"${nuevaAct.titulo}" — ${nuevaAct.area_ref} · ${nuevaAct.mes}`, actividad_id: data.id, leida: false })
        }
      }

      setModalNuevaAct(false)
      setNuevaAct({ titulo: '', descripcion: '', area_ref: 'EMC', responsable_ref: 'DG_Joselyn', mes: MESES[new Date().getMonth()], horas: '', dias_produccion: '', estado: 'Pendiente', fecha_entrega: '', solicitado_por: 'Coord_MFreddy', drive_url: '' })
      mostrarMensaje('ok', 'Tarea creada exitosamente')
    } catch (e) {
      mostrarMensaje('error', 'Error inesperado al crear la tarea')
    }
    setCreandoAct(false)
  }

  async function cambiarRol(id: string, rol: string) {
    await supabase.from('usuarios').update({ rol }).eq('id', id)
    setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, rol } : u))
    mostrarMensaje('ok', 'Rol actualizado')
  }
  async function toggleActivo(id: string, activo: boolean) {
    await supabase.from('usuarios').update({ activo: !activo }).eq('id', id)
    setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: !activo } : u))
    mostrarMensaje('ok', !activo ? 'Usuario activado' : 'Usuario desactivado')
  }
  async function validarUsuario(id: string) {
    await supabase.from('usuarios').update({ validado: true, activo: true }).eq('id', id)
    setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, validado: true, activo: true } : u))
    mostrarMensaje('ok', 'Usuario validado')
  }
  async function eliminarUsuario(id: string) {
    await supabase.from('usuarios').delete().eq('id', id)
    setAdminUsuarios(prev => prev.filter(u => u.id !== id))
    setModalEliminar(null)
    mostrarMensaje('ok', 'Usuario eliminado')
  }
  async function resetPassword(email: string, nombre: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    if (error) mostrarMensaje('error', 'Error al enviar el email')
    else mostrarMensaje('ok', `Email enviado a ${nombre}`)
  }
  async function crearUsuario() {
    if (!nuevoUsr.nombre || !nuevoUsr.apellido || !nuevoUsr.email || !nuevoUsr.password) { mostrarMensaje('error', 'Completa todos los campos'); return }
    setGuardandoAdmin(true)
    const { data: signUpData, error } = await supabase.auth.signUp({ email: nuevoUsr.email, password: nuevoUsr.password })
    if (error) { mostrarMensaje('error', error.message); setGuardandoAdmin(false); return }
    const uid = signUpData?.user?.id
    if (uid) await supabase.from('usuarios').upsert({ id: uid, nombre: nuevoUsr.nombre, apellido: nuevoUsr.apellido, email: nuevoUsr.email, rol: nuevoUsr.rol, tipo: nuevoUsr.tipo, color: nuevoUsr.color, empresa: nuevoUsr.empresa, cargo: CARGOS_DIR[nuevoUsr.email.toLowerCase()] || '', activo: true, validado: true, ubicacion: 'Guayaquil, Ecuador' })
    mostrarMensaje('ok', `Usuario ${nuevoUsr.nombre} creado`)
    setModalCrear(false)
    setNuevoUsr({ nombre: '', apellido: '', email: '', password: '', rol: 'pasante', tipo: 'B', color: '#7C6FF7', empresa: 'Eminat Holding' })
    const { data } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false })
    setAdminUsuarios((data || []).map(u => ({ ...u, cargo: u.cargo || CARGOS_DIR[u.email?.toLowerCase()] || '' })))
    setGuardandoAdmin(false)
  }
  async function guardarEdicion() {
    if (!modalEditar) return
    setGuardandoAdmin(true)
    await supabase.from('usuarios').update({ nombre: modalEditar.nombre, apellido: modalEditar.apellido, rol: modalEditar.rol, tipo: modalEditar.tipo, color: modalEditar.color, ubicacion: modalEditar.ubicacion, empresa: modalEditar.empresa }).eq('id', modalEditar.id)
    setAdminUsuarios(prev => prev.map(u => u.id === modalEditar.id ? { ...u, ...modalEditar } : u))
    mostrarMensaje('ok', 'Usuario actualizado')
    setModalEditar(null)
    setGuardandoAdmin(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid #7C6FF7`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Sans' }}>Cargando Eminat App...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const sidebarIcons = [
    { key: 'home', icon: '🏠', label: 'Home', action: () => { setVista('dashboard'); setSidebarPanel(null) } },
    { key: 'mkt', icon: '🚀', label: 'Stratix MKT', action: () => setSidebarPanel(prev => prev === 'mkt' ? null : 'mkt') },
    { key: 'finanzas', icon: '💰', label: 'Finanzas', soon: true, action: () => mostrarMensaje('ok', 'Finanzas — Próximamente') },
    { key: 'rrhh', icon: '👤', label: 'TH/HR', soon: true, action: () => mostrarMensaje('ok', 'TH/HR — Próximamente') },
    { key: 'research', icon: '🔬', label: 'Research', soon: true, action: () => mostrarMensaje('ok', 'Research — Próximamente') },
    { key: 'directorio', icon: '🏢', label: 'Directorio', action: () => { setVista('directorio'); setSidebarPanel(null) } },
    ...(esSuperAdmin ? [{ key: 'admin', icon: '🔐', label: 'Admin', action: () => { setVista('admin'); setSidebarPanel(null) } }] : []),
  ]
  const mktSubItems = [
    { id: 'sub-overview', vista: 'mkt', icon: '📊', label: 'Dashboard', tab: 'overview' },
    { id: 'sub-prod', vista: 'mkt', icon: '⚡', label: 'Producción', tab: 'kanban' },
    { id: 'sub-sol', vista: 'solicitudes', icon: '📋', label: 'Solicitudes' },
    { id: 'sub-equipo', vista: 'equipo', icon: '👥', label: 'Equipo' },
    { id: 'sub-reporte', vista: 'reporte', icon: '💰', label: 'Reporte' },
  ]
  const isMktVista = ['dashboard', 'mkt', 'solicitudes', 'equipo', 'reporte'].includes(vista)
  const activeIconKey = vista === 'directorio' ? 'directorio' : vista === 'admin' ? 'admin' : isMktVista ? 'mkt' : 'home'

  // GANTT helpers
  const getGanttActs = () => {
    const mesesGantt: Record<string, string[]> = { Q1: ['Enero','Febrero','Marzo'], Q2: ['Abril','Mayo','Junio'], Q3: ['Julio','Agosto','Septiembre'], Q4: ['Octubre','Noviembre','Diciembre'] }
    let acts = actividades.filter(a => a.fecha_entrega)
    if (mesesGantt[ganttVista]) acts = acts.filter(a => mesesGantt[ganttVista].includes(a.mes))
    else if (ganttVista === 'Semana') {
      const ini = new Date(hoy); ini.setDate(hoy.getDate() - hoy.getDay())
      const fin = new Date(ini); fin.setDate(ini.getDate() + 6)
      acts = acts.filter(a => { const f = new Date(a.fecha_entrega); return f >= ini && f <= fin })
    } else if (ganttVista === 'Mes') {
      acts = acts.filter(a => { const f = new Date(a.fecha_entrega); return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear() })
    }
    return acts.sort((a, b) => new Date(a.fecha_entrega).getTime() - new Date(b.fecha_entrega).getTime())
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: bg, color: t1, fontFamily: 'DM Sans, sans-serif', transition: 'background .3s' }}>

      {/* MOBILE OVERLAY */}
      {mobileSidebarOpen && <div onClick={() => setMobileSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 49 }} />}

      {/* SIDEBAR */}
      <aside className={`sidebar-root${mobileSidebarOpen ? ' open' : ''}`} style={{ display: 'flex', flexShrink: 0, height: '100vh', position: 'relative', zIndex: 50 }}>
        {/* ICON BAR */}
        <div style={{ width: 62, background: s1, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12 }}>
          {/* Icon buttons */}
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '0 4px', width: '100%' }}>
            {sidebarIcons.map(item => (
              <button key={item.key} onClick={() => { item.action(); setMobileSidebarOpen(false) }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, width: 52, height: 52, borderRadius: 12, border: 'none', cursor: 'pointer', background: activeIconKey === item.key ? `${accent}18` : 'transparent', color: activeIconKey === item.key ? accent : t2, transition: 'all .15s', position: 'relative' }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
                <span style={{ fontSize: 8, fontWeight: 600, fontFamily: 'DM Sans', letterSpacing: '.02em', lineHeight: 1 }}>{item.label}</span>
                {item.soon && <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: t3 }} />}
                {activeIconKey === item.key && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, borderRadius: '0 3px 3px 0', background: accent }} />}
              </button>
            ))}
          </nav>

          {/* Bottom user avatar */}
          <div style={{ padding: '10px 0 12px', borderTop: `1px solid ${border}`, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: usuario?.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>
                {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
              </div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: '#34D399', border: `2px solid ${s1}` }} />
            </div>
          </div>
        </div>

        {/* SUBMENU PANEL */}
        <div style={{ width: sidebarPanel === 'mkt' ? 172 : 0, background: s1, borderRight: sidebarPanel === 'mkt' ? `1px solid ${border}` : 'none', overflow: 'hidden', transition: 'width .2s ease', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 14px 10px' }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 13, color: t1, whiteSpace: 'nowrap' }}>Stratix MKT</div>
            <div style={{ fontSize: 9, color: t3, fontFamily: 'DM Mono', marginTop: 2, whiteSpace: 'nowrap' }}>Marketing & Producción</div>
          </div>
          <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
            {mktSubItems.map(item => {
              const isActive = item.tab ? (vista === item.vista && mktTab === item.tab) : vista === item.vista
              return (
                <button key={item.id} onClick={() => { setVista(item.vista); if (item.tab) setMktTab(item.tab); setMobileSidebarOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 500, textAlign: 'left', whiteSpace: 'nowrap', color: isActive ? accent : t2, background: isActive ? `${accent}15` : 'transparent', marginBottom: 2, transition: 'all .15s' }}>
                  <span style={{ fontSize: 13 }}>{item.icon}</span>
                  {item.label}
                  {isActive && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: accent }} />}
                </button>
              )
            })}
          </nav>
          {/* User profile card */}
          <div style={{ padding: 10, borderTop: `1px solid ${border}` }}>
            <div style={{ padding: '10px 10px', borderRadius: 10, background: `${accent}08`, border: `1px solid ${accent}15` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: usuario?.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
                    {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
                  </div>
                  <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#34D399', border: `2px solid ${s1}` }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.nombre}</div>
                  <div style={{ fontSize: 9, color: accent, whiteSpace: 'nowrap' }}>{cargo}</div>
                </div>
              </div>
              <div style={{ fontSize: 9, color: t3, marginBottom: 6, whiteSpace: 'nowrap' }}>📍 {usuario?.ubicacion || 'Guayaquil, EC'}</div>
              <button onClick={handleLogout} style={{ width: '100%', padding: '4px', borderRadius: 6, border: `1px solid ${border}`, background: 'transparent', color: t3, fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>Cerrar sesión</button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* TOPBAR */}
        <div style={{ padding: '11px 24px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: s1, position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-hamburger" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} style={{ display: 'none', background: 'none', border: `1px solid ${border}`, borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: t1, fontSize: 18, lineHeight: 1 }}>☰</button>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: t1 }}>
                {vista === 'dashboard' && `Eminat Group — Bienvenido, ${usuario?.nombre}`}
                {vista === 'mkt' && 'Stratix MKT — Producción'}
                {vista === 'solicitudes' && 'Solicitudes'}
                {vista === 'equipo' && 'Equipo de Marketing'}
                {vista === 'directorio' && 'Directorio del Holding'}
                {vista === 'admin' && 'Admin Panel'}
                {vista === 'reporte' && 'Reporte'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <span style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {horaActual}
                </span>
                <span style={{ width: 1, height: 10, background: border }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {MARCAS_LIST.map(m => (
                    <span key={m.codigo} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontFamily: 'DM Mono', color: m.color, fontWeight: 600, letterSpacing: '.02em' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                      {m.codigo}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mensaje && (
              <div style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, background: mensaje.tipo === 'ok' ? 'rgba(52,211,153,.15)' : 'rgba(248,113,113,.15)', color: mensaje.tipo === 'ok' ? '#34D399' : '#F87171', border: `1px solid ${mensaje.tipo === 'ok' ? '#34D39940' : '#F8717140'}` }}>
                {mensaje.tipo === 'ok' ? '✓' : '✕'} {mensaje.texto}
              </div>
            )}
            {/* CAMPANA */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => { setNotifAbiertas(!notifAbiertas); if (!notifAbiertas) { const ids = notificaciones.filter((n: any) => !n.leida).map((n: any) => n.id); if (ids.length > 0) supabase.from('notificaciones').update({ leida: true }).in('id', ids).then(() => setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))) } }}
                style={{ position: 'relative', padding: '7px 9px', borderRadius: 10, border: `1px solid ${border}`, background: notifAbiertas ? `${accent}20` : s2, color: notifAbiertas ? accent : t2, fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>
                🔔
                {notificaciones.filter((n: any) => !n.leida).length > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#F87171', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${s1}` }}>
                    {notificaciones.filter((n: any) => !n.leida).length > 9 ? '9+' : notificaciones.filter((n: any) => !n.leida).length}
                  </span>
                )}
              </button>
              {notifAbiertas && (
                <div style={{ position: 'absolute', top: '110%', right: 0, width: 320, background: s1, border: `1px solid ${border}`, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 50, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, color: t1 }}>Notificaciones</div>
                    <button onClick={() => { supabase.from('notificaciones').update({ leida: true }).eq('leida', false).then(() => setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))) }} style={{ fontSize: 11, color: t3, background: 'none', border: 'none', cursor: 'pointer' }}>Marcar todas leidas</button>
                  </div>
                  <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                    {notificaciones.length === 0 ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: t3 }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                        <div style={{ fontSize: 12 }}>Sin notificaciones</div>
                      </div>
                    ) : notificaciones.map((n: any) => (
                      <div key={n.id} onClick={() => { if (n.actividad_id) { const act = actividades.find((a: any) => a.id === n.actividad_id); if (act) { setModalVerAct(act); setNotifAbiertas(false) } } }}
                        style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, cursor: n.actividad_id ? 'pointer' : 'default', background: n.leida ? 'transparent' : `${accent}08`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.leida ? 'transparent' : accent, flexShrink: 0, marginTop: 4 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: n.leida ? 400 : 600, color: t1 }}>{n.titulo}</div>
                          <div style={{ fontSize: 11, color: t2, marginTop: 2, lineHeight: 1.4 }}>{n.mensaje}</div>
                          <div style={{ fontSize: 10, color: t3, marginTop: 4 }}>{new Date(n.created_at).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, background: '#34D39912', border: '1px solid #34D39930' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
              <span style={{ fontSize: 11, color: '#34D399', fontWeight: 500 }}>{onlineCount > 0 ? onlineCount : 1} online</span>
            </div>
            <button onClick={() => setDark(!dark)} style={{ padding: '6px 11px', borderRadius: 20, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer' }}>
              {dark ? '☀️' : '🌙'}
            </button>
            {vista === 'mkt' && mktTab === 'kanban' && (
              <button onClick={() => setModalNuevaAct(true)} style={{ padding: '7px 16px', borderRadius: 10, background: accent, color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Nueva tarea
              </button>
            )}
            {esSuperAdmin && vista === 'admin' && (
              <button onClick={() => setModalCrear(true)} style={{ padding: '7px 16px', borderRadius: 10, background: '#F87171', color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                + Crear usuario
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '20px 24px', flex: 1, overflow: 'auto' }}>

          {/* HOME — CIRCULAR INFOGRAPHIC */}
          {vista === 'dashboard' && (() => {
            const brandNodes = [
              { key: 'mkt', icon: '🚀', name: 'Stratix MKT', color: accent, loc: 'Guayaquil', tz: 'America/Guayaquil', desc: 'Agencia de marketing y producción creativa del Holding Eminat.', action: () => setVista('mkt') },
              { key: 'emc', icon: '🏥', name: 'EMC Medical Center', color: '#60A5FA', loc: 'Guayaquil', tz: 'America/Guayaquil', desc: 'Centro médico especializado en salud integral y bienestar.', action: () => mostrarMensaje('ok', 'EMC Medical Center — Próximamente') },
              { key: 'svn', icon: '💎', name: 'Soy Vivi Negrete', color: '#F472B6', loc: 'Miami', tz: 'America/New_York', desc: 'Marca personal de lifestyle, moda y contenido digital.', action: () => mostrarMensaje('ok', 'Soy Vivi Negrete — Próximamente') },
              { key: 'erg', icon: '🔬', name: 'Eminat Research Group', color: '#A78BFA', loc: 'Guayaquil', tz: 'America/Guayaquil', desc: 'División de investigación e innovación del Holding.', action: () => mostrarMensaje('ok', 'Eminat Research Group — Próximamente') },
              { key: 'vnf', icon: '🤝', name: 'VN Foundation', color: '#FB923C', loc: 'Guayaquil', tz: 'America/Guayaquil', desc: 'Fundación social enfocada en educación y desarrollo comunitario.', action: () => mostrarMensaje('ok', 'VN Foundation — Próximamente') },
              { key: 'premier', icon: '🏆', name: 'Premier', color: '#34D399', loc: 'Miami', tz: 'America/New_York', desc: 'División premium de servicios y productos exclusivos.', action: () => mostrarMensaje('ok', 'Premier — Próximamente') },
              { key: 'ornella', icon: '🤖', name: 'Ornella IA', color: '#F87171', loc: 'Guayaquil', tz: 'America/Guayaquil', desc: 'Plataforma de inteligencia artificial y automatización.', action: () => mostrarMensaje('ok', 'Ornella IA — Próximamente') },
              { key: 'mentor', icon: '📚', name: 'Mentor', color: '#FBB040', loc: 'Guayaquil', tz: 'America/Guayaquil', desc: 'Plataforma educativa de capacitación y mentoría profesional.', action: () => mostrarMensaje('ok', 'Mentor — Próximamente') },
            ]
            const radius = 220
            const getLocalTime = (tz: string) => { try { return new Date().toLocaleTimeString('es-EC', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) } catch { return horaActual } }
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)', position: 'relative' }}>
                {/* Orbit ring */}
                <div className="orbit-ring" style={{ position: 'absolute', width: radius * 2 + 80, height: radius * 2 + 80, borderRadius: '50%', border: `1px solid ${border}` }} />
                <div className="orbit-ring-inner" style={{ position: 'absolute', width: radius * 2 - 40, height: radius * 2 - 40, borderRadius: '50%', border: `1px dashed ${border}` }} />

                {/* Center node */}
                <div className="center-pulse" style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                  <div style={{ width: 90, height: 90, borderRadius: '50%', background: s1, border: `2px solid ${accent}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${accent}40, 0 0 80px ${accent}15` }}>
                    <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 11, color: accent, lineHeight: 1.2, textAlign: 'center' }}>Eminat</div>
                    <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 13, color: t1, lineHeight: 1 }}>Group</div>
                  </div>
                </div>

                {/* Brand nodes */}
                {brandNodes.map((brand, i) => {
                  const angle = (i * 360 / brandNodes.length - 90) * (Math.PI / 180)
                  const x = Math.cos(angle) * radius
                  const y = Math.sin(angle) * radius
                  const isHovered = hoveredBrand === brand.key
                  return (
                    <div key={brand.key} style={{ position: 'absolute', transform: `translate(${x}px, ${y}px)`, zIndex: isHovered ? 10 : 1 }}>
                      {/* Connection line */}
                      <svg style={{ position: 'absolute', left: '50%', top: '50%', width: 1, height: 1, overflow: 'visible', pointerEvents: 'none', zIndex: -1 }}>
                        <line x1="0" y1="0" x2={-x} y2={-y} stroke={brand.color} strokeWidth={isHovered ? 1.5 : 0.5} strokeOpacity={isHovered ? 0.6 : 0.15} strokeDasharray={isHovered ? 'none' : '4 4'} />
                      </svg>
                      {/* Node */}
                      <button onClick={brand.action} onMouseEnter={() => setHoveredBrand(brand.key)} onMouseLeave={() => setHoveredBrand(null)}
                        className="brand-node" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'transform .2s', transform: isHovered ? 'scale(1.12)' : 'scale(1)' }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: s1, border: `2px solid ${isHovered ? brand.color : border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, transition: 'all .25s', boxShadow: isHovered ? `0 0 20px ${brand.color}40` : 'none' }}>
                          {brand.icon}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: isHovered ? brand.color : t1, fontFamily: 'DM Sans', textAlign: 'center', maxWidth: 90, lineHeight: 1.2, transition: 'color .2s' }}>{brand.name}</div>
                        <div style={{ fontSize: 8, color: t3, fontFamily: 'DM Mono', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span>📍 {brand.loc}</span>
                          <span style={{ color: brand.color }}>{getLocalTime(brand.tz)}</span>
                        </div>
                      </button>
                      {/* Tooltip */}
                      {isHovered && (
                        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8, background: s1, border: `1px solid ${brand.color}40`, borderRadius: 12, padding: '12px 14px', width: 200, zIndex: 20, boxShadow: `0 8px 32px rgba(0,0,0,.5)` }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: brand.color, marginBottom: 4 }}>{brand.name}</div>
                          <div style={{ fontSize: 10, color: t2, lineHeight: 1.5 }}>{brand.desc}</div>
                          <div style={{ marginTop: 8, fontSize: 9, color: t3, display: 'flex', justifyContent: 'space-between' }}>
                            <span>📍 {brand.loc}</span>
                            <span style={{ fontFamily: 'DM Mono', color: brand.color }}>{getLocalTime(brand.tz)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* EMINAT MKT */}
          {vista === 'mkt' && (
            <div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}` }}>
                {[{ key: 'overview', label: '📊 Overview' }, { key: 'kanban', label: '⚡ Kanban' }, { key: 'gantt', label: '📊 Gantt' }, { key: 'horas', label: '⏱ Horas' }].map(t => (
                  <button key={t.key} onClick={() => setMktTab(t.key)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent', color: mktTab === t.key ? t1 : t3, borderBottom: mktTab === t.key ? `2px solid ${accent}` : '2px solid transparent' }}>{t.label}</button>
                ))}
              </div>

              {/* OVERVIEW */}
              {mktTab === 'overview' && (
                <div>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
                    {TRIMESTRES.map(q => (
                      <button key={q} onClick={() => setTrimestre(q)} style={{ padding: '5px 16px', borderRadius: 20, border: `1px solid ${trimestre === q ? accent : border}`, background: trimestre === q ? accent : 'transparent', color: trimestre === q ? 'white' : t2, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{q}</button>
                    ))}
                  </div>
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
                        <div style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, lineHeight: 1, color: k.color }}>{k.value}</div>
                        <div style={{ fontSize: 9, color: t3, marginTop: 6 }}>{k.sub}</div>
                        <div style={{ marginTop: 8, height: 2, borderRadius: 1, background: border }}>
                          <div style={{ height: 2, borderRadius: 1, background: k.color, width: `${pctCompletado}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 270px', gap: 12, marginBottom: 14 }}>
                    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Produccion por mes — {trimestre}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 90 }}>
                        {datosPorMes.map(d => (
                          <div key={d.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ fontSize: 8, color: t3 }}>{d.total}</div>
                            <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 66 }}>
                              <div style={{ flex: 1, background: `${accent}30`, borderRadius: '3px 3px 0 0', height: `${(d.total / maxTotal) * 100}%`, minHeight: d.total > 0 ? 3 : 0 }} />
                              <div style={{ flex: 1, background: '#34D399', borderRadius: '3px 3px 0 0', height: `${(d.completadas / maxTotal) * 100}%`, minHeight: d.completadas > 0 ? 3 : 0 }} />
                            </div>
                            <div style={{ fontSize: 9, color: t3 }}>{d.mes}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Por marca — {trimestre}</div>
                      {datosPorMarca.map(m => (
                        <div key={m.codigo} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 10, color: t2, width: 52 }}>{m.codigo}</span>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: border, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 3, background: m.color, width: `${(m.total / maxMarca) * 100}%` }} />
                          </div>
                          <span style={{ fontSize: 10, color: t3, width: 24, textAlign: 'right' }}>{m.total}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Marketing Today</div>
                        <span style={{ fontSize: 10, color: '#34D399' }}>{onlineCount > 0 ? onlineCount : 1} online</span>
                      </div>
                      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                        {equipoSinMi.map(u => {
                          const userInfo = usuarios.find(us => us.nombre === u.nombre)
                          const isOnline = userInfo?.online_at ? new Date(userInfo.online_at) > new Date(Date.now() - 5 * 60 * 1000) : false
                          return (
                            <div key={u.id} style={{ padding: '8px 14px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ position: 'relative', flexShrink: 0 }}>
                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: u.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white' }}>{u.nombre?.[0]}{u.apellido?.[0]}</div>
                                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 7, height: 7, borderRadius: '50%', background: isOnline ? '#34D399' : '#555', border: `2px solid ${s1}` }} />
                              </div>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: t1 }}>{u.nombre}</div>
                                <div style={{ fontSize: 9, color: isOnline ? '#34D399' : t3 }}>{isOnline ? '● Activo ahora' : 'Offline'}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 270px', gap: 12 }}>
                    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Actividades recientes</div>
                        <button onClick={() => setVista('solicitudes')} style={{ fontSize: 10, color: accent, background: 'none', border: 'none', cursor: 'pointer' }}>Ver todas →</button>
                      </div>
                      {actsFiltradas.slice(0, 6).map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: `1px solid ${border}` }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: ESTADO_COLORS[a.estado] || t3, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titulo}</div>
                            <div style={{ fontSize: 9, color: t3 }}>{a.area_ref} · {a.responsable_ref} · {a.mes}</div>
                          </div>
                          <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 9, background: `${ESTADO_COLORS[a.estado] || t3}20`, color: ESTADO_COLORS[a.estado] || t3, whiteSpace: 'nowrap' }}>{a.estado}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14 }}>
                      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}` }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Ranking del equipo</div>
                      </div>
                      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {datosPorMiembro.map((m, i) => (
                          <div key={m.ref}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 9, color: t3, width: 12 }}>{i + 1}</span>
                                <span style={{ fontSize: 11, color: t1, fontWeight: 500 }}>{m.nombre}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <span style={{ fontSize: 9, color: '#34D399' }}>{m.completadas}✓</span>
                                <span style={{ fontSize: 9, color: t3 }}>{m.horas}h</span>
                              </div>
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: border, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 2, background: accent, width: `${(m.total / maxMiembro) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* KANBAN */}
              {mktTab === 'kanban' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: t3 }}>{actsKanban.length} tareas · Arrastra las tarjetas para cambiar su estado</div>
                    <select value={mesKanban} onChange={e => setMesKanban(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
                      <option value="">Todos los meses</option>
                      {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, alignItems: 'start' }}>
                    {COLUMNAS_KANBAN.map(col => (
                      <div key={col} onDragOver={e => { e.preventDefault(); onDragOverCol(col) }} onDrop={() => onDrop(col)}
                        style={{ borderRadius: 14, overflow: 'hidden', minHeight: 100, background: dragOver === col ? `${ESTADO_COLORS[col]}08` : s2, border: dragOver === col ? `2px dashed ${ESTADO_COLORS[col]}` : `1px solid ${border}`, transition: 'all .15s' }}>
                        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${ESTADO_COLORS[col]}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 9, height: 9, borderRadius: '50%', background: ESTADO_COLORS[col] }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: t1 }}>{col}</span>
                          </div>
                          <span style={{ fontSize: 11, color: t3, background: s3, padding: '1px 8px', borderRadius: 10, fontFamily: 'DM Mono' }}>{porColumna(col).length}</span>
                        </div>
                        <div style={{ padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {porColumna(col).map(a => {
                            const marcaColor = getColorMarca(a.area_ref)
                            const miembroInicial = Object.entries(MIEMBROS_REFS).find(([ref]) => ref === a.responsable_ref)
                            return (
                              <div key={a.id} draggable onDragStart={() => onDragStart(a.id)} onDragEnd={onDragEnd} onClick={() => setModalVerAct(a)}
                                style={{ background: s1, borderRadius: 12, padding: '12px 13px', border: `1px solid ${dragId === a.id ? accent : border}`, cursor: 'grab', opacity: dragId === a.id ? .4 : 1, boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'all .15s' }}>
                                <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${marcaColor}25`, color: marcaColor, fontWeight: 600 }}>{a.area_ref}</span>
                                  {a.mes && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${t3}20`, color: t3 }}>{a.mes}</span>}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: t1, lineHeight: 1.4, marginBottom: 10 }}>{a.titulo}</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                                      {miembroInicial?.[1]?.[0] || '?'}
                                    </div>
                                    <span style={{ fontSize: 10, color: t3 }}>{miembroInicial?.[1] || a.responsable_ref}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {a.horas && <span style={{ fontSize: 9, color: t3 }}>⏱ {a.horas}h</span>}
                                    {a.fecha_entrega && <span style={{ fontSize: 9, color: new Date(a.fecha_entrega) < new Date() && a.estado !== 'Completado' ? '#F87171' : t3 }}>📅 {new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}</span>}
                                    {a.drive_url && <span style={{ fontSize: 9, color: '#60A5FA' }}>🔗</span>}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          {col === 'Pendiente' && (
                            <button onClick={() => { setNuevaAct(p => ({ ...p, estado: 'Pendiente' })); setModalNuevaAct(true) }}
                              style={{ padding: '8px', borderRadius: 10, border: `1px dashed ${border}`, background: 'transparent', color: t3, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              <span style={{ fontSize: 16 }}>+</span> Agregar tarea
                            </button>
                          )}
                          {porColumna(col).length === 0 && col !== 'Pendiente' && (
                            <div style={{ border: `2px dashed ${border}`, borderRadius: 10, padding: '20px', textAlign: 'center', color: t3, fontSize: 11 }}>Arrastra aqui</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GANTT */}
              {mktTab === 'gantt' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Diagrama de Gantt</span>
                      <span style={{ fontSize: 11, color: t3, marginLeft: 8 }}>Vista por fechas de entrega</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['Semana', 'Mes', 'Q1', 'Q2', 'Q3', 'Q4'].map(v => (
                        <button key={v} onClick={() => setGanttVista(v)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${ganttVista === v ? accent : border}`, background: ganttVista === v ? accent : 'transparent', color: ganttVista === v ? 'white' : t2, cursor: 'pointer' }}>{v}</button>
                      ))}
                    </div>
                  </div>
                  {(() => {
                    const actsGantt = getGanttActs()
                    const fechas = actsGantt.map(a => new Date(a.fecha_entrega)).sort((a, b) => a.getTime() - b.getTime())
                    const fechaMin = fechas[0] || hoy
                    const fechaMax = fechas[fechas.length - 1] || new Date(hoy.getTime() + 30 * 86400000)
                    const totalDiasGantt = Math.max(Math.ceil((fechaMax.getTime() - fechaMin.getTime()) / 86400000) + 1, 7)
                    const diasMostrar = Math.min(totalDiasGantt, 31)
                    return (
                      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', borderBottom: `1px solid ${border}` }}>
                          <div style={{ width: 220, flexShrink: 0, padding: '10px 14px', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderRight: `1px solid ${border}` }}>Tarea / Responsable</div>
                          <div style={{ flex: 1, display: 'flex', overflowX: 'auto' }}>
                            {Array.from({ length: diasMostrar }).map((_, i) => {
                              const d = new Date(fechaMin.getTime() + i * 86400000)
                              const esHoy = d.toDateString() === hoy.toDateString()
                              const esFinde = d.getDay() === 0 || d.getDay() === 6
                              return (
                                <div key={i} style={{ minWidth: 44, textAlign: 'center', padding: '8px 4px', fontSize: 9, color: esHoy ? accent : esFinde ? '#F87171' : t3, fontFamily: 'DM Mono', background: esHoy ? `${accent}10` : esFinde ? 'rgba(248,113,113,0.05)' : 'transparent', borderRight: `1px solid ${border}` }}>
                                  <div style={{ fontWeight: esHoy ? 700 : 400 }}>{d.getDate()}</div>
                                  <div>{['D','L','M','X','J','V','S'][d.getDay()]}</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                          {actsGantt.slice(0, 40).map(a => {
                            const fechaAct = new Date(a.fecha_entrega)
                            const diaOffset = Math.max(Math.ceil((fechaAct.getTime() - fechaMin.getTime()) / 86400000), 0)
                            const colorBarra = ESTADO_COLORS[a.estado] || accent
                            const diasProd = Math.max(Number(a.dias_produccion) || 1, 1)
                            return (
                              <div key={a.id} onClick={() => setModalVerAct(a)} style={{ display: 'flex', borderBottom: `1px solid ${border}`, cursor: 'pointer' }}>
                                <div style={{ width: 220, flexShrink: 0, padding: '10px 14px', borderRight: `1px solid ${border}` }}>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titulo}</div>
                                  <div style={{ fontSize: 9, color: t3, marginTop: 2 }}>
                                    <span style={{ marginRight: 6 }}>{MIEMBROS_REFS[a.responsable_ref] || a.responsable_ref}</span>
                                    <span style={{ padding: '1px 5px', borderRadius: 4, background: `${getColorMarca(a.area_ref)}25`, color: getColorMarca(a.area_ref), fontSize: 8 }}>{a.area_ref}</span>
                                  </div>
                                </div>
                                <div style={{ flex: 1, position: 'relative', height: 48, overflowX: 'hidden' }}>
                                  <div style={{ position: 'absolute', left: diaOffset * 44 + 4, top: '50%', transform: 'translateY(-50%)', height: 22, width: Math.max(diasProd * 44 - 8, 36), borderRadius: 8, background: `${colorBarra}25`, border: `1.5px solid ${colorBarra}`, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4 }}>
                                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: colorBarra, flexShrink: 0 }} />
                                    <span style={{ fontSize: 9, color: colorBarra, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{a.estado}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          {actsGantt.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>Sin tareas con fecha de entrega para esta vista</div>}
                        </div>
                        <div style={{ padding: '10px 14px', borderTop: `1px solid ${border}`, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {Object.entries(ESTADO_COLORS).map(([estado, color]) => (
                            <div key={estado} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: t3 }}>
                              <div style={{ width: 10, height: 10, borderRadius: 3, background: `${color}30`, border: `1.5px solid ${color}` }} />
                              {estado}
                            </div>
                          ))}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#F87171' }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(248,113,113,0.1)', border: '1px solid #F87171' }} />
                            Fin de semana
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* HORAS */}
              {mktTab === 'horas' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>{esSuperAdmin ? 'Resumen del equipo' : 'Tus horas'}</span>
                    <select value={mesHoras} onChange={e => setMesHoras(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
                      <option value="">Todos los meses</option>
                      {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {resumenHoras.map(r => (
                      <div key={r.ref} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: t1 }}>{r.nombre}</div>
                            <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>{r.ref}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'Syne', fontSize: 30, fontWeight: 800, color: '#60A5FA', lineHeight: 1 }}>{r.horas}h</div>
                            <div style={{ fontSize: 10, color: t3 }}>{r.dias} dias de produccion</div>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
                          {[{ label: 'Total tareas', value: r.total, color: t1 }, { label: 'Completadas', value: r.completadas, color: '#34D399' }, { label: 'Efectividad', value: `${r.total > 0 ? Math.round((r.completadas / r.total) * 100) : 0}%`, color: accent }].map(s => (
                            <div key={s.label} style={{ background: s2, borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne', color: s.color }}>{s.value}</div>
                              <div style={{ fontSize: 10, color: t3, marginTop: 2 }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: border, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: '#34D399', width: `${r.total > 0 ? (r.completadas / r.total) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* REPORTE */}
          {vista === 'reporte' && (
            <div id="reporte-content">
              <div id="print-header" style={{ display: 'none', textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #333' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#111' }}>Stratix Solutions</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: '#333' }}>Reporte de Producción para Pago</div>
              </div>
              <div id="reporte-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Reporte de produccion para pago</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {esSuperAdmin && (
                    <select value={miembroReporte} onChange={e => setMiembroReporte(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
                      <option value="">Seleccionar</option>
                      {Object.entries(MIEMBROS_REFS).map(([ref, nombre]) => <option key={ref} value={ref}>{nombre}</option>)}
                    </select>
                  )}
                  <select value={mesReporte} onChange={e => setMesReporte(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
                    {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <button onClick={() => {
                    const w = window.open('', '_blank', 'width=900,height=700')
                    if (!w) return
                    const estadoColor = (e: string) => ({ 'Completado': '#34D399', 'Por aprobar': '#FBB040', 'En proceso': '#7C6FF7', 'Pendiente': '#9494B3' }[e] || '#999')
                    const rows = actsRep.map((a: any, i: number) => `<tr>
                      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;color:#666">${i + 1}</td>
                      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#111;font-weight:500">${a.titulo || ''}</td>
                      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555">${a.area_ref || ''}</td>
                      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555;font-family:monospace;text-align:center">${a.horas || 0}h</td>
                      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555;font-family:monospace;text-align:center">${a.dias_produccion || 0}</td>
                      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555;text-align:center">${a.mes || ''}</td>
                      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center"><span style="font-size:11px;padding:2px 10px;border-radius:20px;background:${estadoColor(a.estado)}20;color:${estadoColor(a.estado)};font-weight:600">${a.estado || ''}</span></td>
                    </tr>`).join('')
                    const today = new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })
                    w.document.write(`<!DOCTYPE html><html><head><title>Reporte de Producción — ${nombreRep}</title>
                    <style>
                      * { margin:0; padding:0; box-sizing:border-box; }
                      body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; color:#111; padding:40px 50px; font-size:13px; }
                      @media print { .no-print { display:none !important; } body { padding:20px 30px; } }
                    </style></head><body>
                    <div style="text-align:center;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #222">
                      <div style="font-size:24px;font-weight:800;letter-spacing:.5px">Stratix Solutions</div>
                      <div style="font-size:14px;font-weight:600;margin-top:4px;color:#444">Reporte de Producción para Pago</div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #e5e7eb">
                      <div>
                        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Colaborador</div>
                        <div style="font-size:20px;font-weight:700">${nombreRep}</div>
                        <div style="font-size:11px;color:#888;font-family:monospace;margin-top:2px">${refRep}</div>
                      </div>
                      <div style="text-align:right">
                        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Periodo</div>
                        <div style="font-size:16px;font-weight:700">${mesReporte} 2026</div>
                      </div>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
                      ${[
                        { label: 'Total tareas', value: actsRep.length, color: '#7C6FF7' },
                        { label: 'Completadas', value: completadasRep, color: '#34D399' },
                        { label: 'Horas totales', value: totalHorasRep + 'h', color: '#F472B6' },
                        { label: 'Días producción', value: totalDiasRep, color: '#60A5FA' }
                      ].map(k => `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center">
                        <div style="font-size:24px;font-weight:800;color:${k.color}">${k.value}</div>
                        <div style="font-size:10px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:.05em">${k.label}</div>
                      </div>`).join('')}
                    </div>
                    <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
                      <thead><tr style="background:#f8f8fa">
                        ${['#', 'Tarea', 'Área', 'Horas', 'Días Prod.', 'Mes', 'Estado'].map(h => `<th style="padding:10px;text-align:left;font-size:10px;color:#888;font-family:monospace;text-transform:uppercase;border-bottom:2px solid #e5e7eb;font-weight:400">${h}</th>`).join('')}
                      </tr></thead>
                      <tbody>${rows}</tbody>
                    </table>
                    ${actsRep.length === 0 ? '<div style="text-align:center;padding:40px;color:#999">Sin tareas para este periodo</div>' : ''}
                    <div style="margin-top:60px;padding-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:80px">
                      <div style="text-align:center">
                        <div style="border-top:1px solid #333;padding-top:10px;font-size:12px;font-weight:600">${nombreRep}</div>
                        <div style="font-size:10px;color:#888;margin-top:2px">Colaborador</div>
                      </div>
                      <div style="text-align:center">
                        <div style="border-top:1px solid #333;padding-top:10px;font-size:12px;font-weight:600">Freddy Crespín</div>
                        <div style="font-size:10px;color:#888;margin-top:2px">Coordinador de Marketing — Aprobado por</div>
                      </div>
                    </div>
                    <div style="margin-top:40px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#aaa">
                      <span>Generado el ${today}</span>
                      <span>Stratix Solutions — Eminat MKT</span>
                    </div>
                    <div class="no-print" style="text-align:center;margin-top:30px">
                      <button onclick="window.print()" style="padding:10px 28px;border-radius:8px;background:#7C6FF7;color:white;border:none;font-size:13px;font-weight:600;cursor:pointer">Imprimir</button>
                    </div>
                    </body></html>`)
                    w.document.close()
                  }} style={{ padding: '7px 14px', borderRadius: 8, background: accent, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Imprimir</button>
                </div>
              </div>
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '24px 28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>Reporte de Produccion</div>
                    <div style={{ fontSize: 12, color: t3 }}>Eminat MKT — Agencia de Marketing del Holding Eminat</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: t3 }}>Periodo</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{mesReporte} 2026</div>
                  </div>
                </div>
                <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Colaborador</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: t1 }}>{nombreRep}</div>
                  <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>{refRep}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
                  {[{ label: 'Total tareas', value: actsRep.length, color: accent }, { label: 'Completadas', value: completadasRep, color: '#34D399' }, { label: 'Horas totales', value: `${totalHorasRep}h`, color: '#F472B6' }, { label: 'Dias produccion', value: totalDiasRep, color: '#60A5FA' }].map(s => (
                    <div key={s.label} style={{ background: s2, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: t3, marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: s2 }}>
                      {['Tarea', 'Area', 'Horas', 'Dias Prod.', 'Estado'].map(h => (
                        <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {actsRep.map(a => (
                      <tr key={a.id} style={{ borderBottom: `1px solid ${border}` }}>
                        <td style={{ padding: '8px 12px', color: t1 }}>{a.titulo}</td>
                        <td style={{ padding: '8px 12px', color: t3 }}>{a.area_ref}</td>
                        <td style={{ padding: '8px 12px', color: t3, fontFamily: 'DM Mono' }}>{a.horas}h</td>
                        <td style={{ padding: '8px 12px', color: t3, fontFamily: 'DM Mono' }}>{a.dias_produccion}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${ESTADO_COLORS[a.estado] || t3}20`, color: ESTADO_COLORS[a.estado] || t3 }}>{a.estado}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {actsRep.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>Sin tareas para este periodo</div>}
                <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
                  <div style={{ textAlign: 'center' }}><div style={{ borderTop: `1px solid ${border}`, paddingTop: 8, fontSize: 11, color: t3 }}>Firma del colaborador</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ borderTop: `1px solid ${border}`, paddingTop: 8, fontSize: 11, color: t3 }}>Firma del coordinador</div></div>
                </div>
              </div>
            </div>
          )}

          {/* SOLICITUDES */}
          {vista === 'solicitudes' && (
            <div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${border}` }}>
                {[{ key: 'lista', label: '📋 Lista de tareas' }, { key: 'disponibilidad', label: '🗓 Disponibilidad' }].map(t => (
                  <button key={t.key} onClick={() => setSolTab(t.key)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent', color: solTab === t.key ? t1 : t3, borderBottom: solTab === t.key ? `2px solid ${accent}` : '2px solid transparent' }}>{t.label}</button>
                ))}
              </div>

              {solTab === 'lista' && (
                <div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="text" placeholder="Buscar por titulo, area..." value={busquedaSol} onChange={e => setBusquedaSol(e.target.value)} style={{ ...inputStyle, width: 280 }} />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {['Todos','Pendiente','En proceso','Por aprobar','Completado'].map(e => (
                        <button key={e} onClick={() => setFiltroEstadoSol(e)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${filtroEstadoSol === e ? ESTADO_COLORS[e] || accent : border}`, background: filtroEstadoSol === e ? `${ESTADO_COLORS[e] || accent}20` : 'transparent', color: filtroEstadoSol === e ? ESTADO_COLORS[e] || accent : t2, cursor: 'pointer' }}>{e}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: s2 }}>
                            {['Titulo', 'Marca', ...(esSuperAdmin ? ['Responsable'] : []), 'Mes', 'Horas', 'Estado', 'Entrega', 'Drive'].map(h => (
                              <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {actividades
                            .filter(a => filtroEstadoSol === 'Todos' || a.estado === filtroEstadoSol)
                            .filter(a => busquedaSol === '' || a.titulo?.toLowerCase().includes(busquedaSol.toLowerCase()) || a.area_ref?.toLowerCase().includes(busquedaSol.toLowerCase()))
                            .map(a => (
                              <tr key={a.id} onClick={() => setModalVerAct(a)} style={{ borderBottom: `1px solid ${border}`, cursor: 'pointer' }}>
                                <td style={{ padding: '10px 14px' }}>
                                  <div style={{ fontSize: 12, fontWeight: 500, color: t1 }}>{a.titulo}</div>
                                  {a.descripcion && <div style={{ fontSize: 10, color: t3, marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.descripcion}</div>}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${getColorMarca(a.area_ref)}25`, color: getColorMarca(a.area_ref), fontWeight: 600 }}>{a.area_ref}</span>
                                </td>
                                {esSuperAdmin && <td style={{ padding: '10px 14px', fontSize: 11, color: t3 }}>{MIEMBROS_REFS[a.responsable_ref] || a.responsable_ref}</td>}
                                <td style={{ padding: '10px 14px', fontSize: 11, color: t3 }}>{a.mes}</td>
                                <td style={{ padding: '10px 14px', fontSize: 11, color: t3, fontFamily: 'DM Mono' }}>{a.horas}h</td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${ESTADO_COLORS[a.estado] || t3}20`, color: ESTADO_COLORS[a.estado] || t3 }}>{a.estado}</span>
                                </td>
                                <td style={{ padding: '10px 14px', fontSize: 11, color: a.fecha_entrega && new Date(a.fecha_entrega) < new Date() && a.estado !== 'Completado' ? '#F87171' : t3 }}>
                                  {a.fecha_entrega ? new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString('es-EC') : '—'}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  {a.drive_url ? <a href={a.drive_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10, color: '#60A5FA', textDecoration: 'none' }}>🔗 Ver</a> : <span style={{ fontSize: 10, color: t3 }}>—</span>}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {solTab === 'disponibilidad' && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Syne', color: t1, marginBottom: 4 }}>Disponibilidad del equipo</div>
                    <div style={{ fontSize: 12, color: t3 }}>Lunes a Viernes · 9:00 AM — 6:00 PM · Hora Guayaquil, Ecuador</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                    {Object.entries(MIEMBROS_REFS).map(([ref, nombre]) => {
                      const tareasActivas = actividades.filter(a => a.responsable_ref === ref && (a.estado === 'En proceso' || a.estado === 'Pendiente'))
                      const horasOcupadas = Math.round(tareasActivas.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10
                      const horasSemanales = 40
                      const horasLibres = Math.max(horasSemanales - horasOcupadas, 0)
                      const pctOcupado = Math.min((horasOcupadas / horasSemanales) * 100, 100)
                      const disponible = pctOcupado < 75
                      const slots = [9, 10, 11, 12, 13, 14, 15, 16, 17]
                      const userInfo = usuarios.find(u => u.responsable_ref === ref)
                      const isOnline = userInfo?.online_at ? new Date(userInfo.online_at) > new Date(Date.now() - 5 * 60 * 1000) : false
                      return (
                        <div key={ref} style={{ background: s1, border: `2px solid ${disponible ? '#34D39930' : '#F8717130'}`, borderRadius: 16, padding: 18, transition: 'all .2s' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ position: 'relative' }}>
                                <div style={{ width: 38, height: 38, borderRadius: '50%', background: userInfo?.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
                                  {nombre[0]}
                                </div>
                                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: isOnline ? '#34D399' : '#555', border: `2px solid ${s1}` }} />
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{nombre}</div>
                                <div style={{ fontSize: 10, color: t3 }}>{tareasActivas.length} tareas activas · {horasOcupadas}h ocupadas</div>
                              </div>
                            </div>
                            <span style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: disponible ? '#34D39920' : '#F8717120', color: disponible ? '#34D399' : '#F87171', fontWeight: 700 }}>
                              {disponible ? '✓ Disponible' : '✕ Ocupado'}
                            </span>
                          </div>
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t3, marginBottom: 5 }}>
                              <span>Capacidad semanal (40h)</span>
                              <span style={{ color: disponible ? '#34D399' : '#F87171', fontWeight: 600 }}>{horasLibres}h libres</span>
                            </div>
                            <div style={{ height: 8, borderRadius: 4, background: border, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 4, background: disponible ? '#34D399' : '#F87171', width: `${pctOcupado}%`, transition: 'width .5s' }} />
                            </div>
                            <div style={{ fontSize: 9, color: t3, marginTop: 4, textAlign: 'right' }}>{Math.round(pctOcupado)}% de capacidad utilizada</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: t3, marginBottom: 6, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Horario hoy (9am-6pm)</div>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {slots.map(hora => {
                                const slotOcupado = pctOcupado > 85 || (pctOcupado > 60 && (hora >= 10 && hora <= 14))
                                return (
                                  <div key={hora} style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, background: slotOcupado ? '#F8717115' : '#34D39915', color: slotOcupado ? '#F87171' : '#34D399', fontFamily: 'DM Mono', border: `1px solid ${slotOcupado ? '#F8717130' : '#34D39930'}` }}>
                                    {hora}:00
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                          {tareasActivas.length > 0 && (
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${border}` }}>
                              <div style={{ fontSize: 10, color: t3, marginBottom: 6 }}>Tareas en curso:</div>
                              {tareasActivas.slice(0, 2).map(a => (
                                <div key={a.id} style={{ fontSize: 11, color: t2, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span style={{ color: getColorMarca(a.area_ref), marginRight: 5 }}>●</span>{a.titulo}
                                </div>
                              ))}
                              {tareasActivas.length > 2 && <div style={{ fontSize: 10, color: t3 }}>+{tareasActivas.length - 2} mas</div>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EQUIPO */}
          {vista === 'equipo' && (
            <div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}` }}>
                {[{ key: 'team', label: '👥 Team' }, { key: 'reporte', label: '💰 Reporte' }].map(t => (
                  <button key={t.key} onClick={() => setSubVista(t.key)} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent', color: subVista === t.key ? t1 : t3, borderBottom: subVista === t.key ? `2px solid ${accent}` : '2px solid transparent' }}>{t.label}</button>
                ))}
              </div>
              {subVista !== 'reporte' ? (
                <div>
                  {['A', 'B'].map(tipo => {
                    const miembros = usuarios.filter(u => u.tipo === tipo || (!u.tipo && tipo === 'A'))
                    if (!miembros.length) return null
                    return (
                      <div key={tipo} style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: tipo === 'A' ? accent : '#F472B6', marginBottom: 12, padding: '4px 12px', background: tipo === 'A' ? `${accent}15` : '#F472B615', borderRadius: 20, display: 'inline-block' }}>
                          Tipo {tipo} — {tipo === 'A' ? 'Staff Creativo' : 'Internos / Pasantes'}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                          {miembros.map(u => {
                            const isOnline = u.online_at ? new Date(u.online_at) > new Date(Date.now() - 5 * 60 * 1000) : false
                            const tareasHoy = actividades.filter(a => a.responsable_ref === u.responsable_ref && a.estado === 'En proceso').length
                            return (
                              <div key={u.id} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                  <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: u.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>{u.nombre?.[0]}{u.apellido?.[0]}</div>
                                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: isOnline ? '#34D399' : '#555', border: `2px solid ${s1}` }} />
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: t1 }}>{u.nombre} {u.apellido}</div>
                                    <div style={{ fontSize: 11, color: t2, marginTop: 1 }}>{u.cargo || CARGOS_DIR[u.email?.toLowerCase()] || u.rol}</div>
                                  </div>
                                </div>
                                <div style={{ fontSize: 10, color: t3, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✉ {u.email}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: 10, color: isOnline ? '#34D399' : t3 }}>{isOnline ? '● Activo ahora' : 'Offline'}</span>
                                  {tareasHoy > 0 && <span style={{ fontSize: 10, color: '#FBB040', background: '#FBB04015', padding: '2px 8px', borderRadius: 10 }}>{tareasHoy} en proceso</span>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {resumenHoras.map(r => (
                    <div key={r.ref} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: t1 }}>{r.nombre}</div>
                          <div style={{ fontSize: 10, color: t3 }}>{r.ref}</div>
                        </div>
                        <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: '#60A5FA' }}>{r.horas}h</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {[{ label: 'Total', value: r.total, color: t1 }, { label: 'Completadas', value: r.completadas, color: '#34D399' }, { label: 'Efectividad', value: `${r.total > 0 ? Math.round((r.completadas / r.total) * 100) : 0}%`, color: accent }].map(s => (
                          <div key={s.label} style={{ background: s2, borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne', color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 9, color: t3 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DIRECTORIO */}
          {vista === 'directorio' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Syne', color: t1 }}>{DIRECTORIO_DATA.length} miembros del Holding Eminat</div>
                <input type="text" placeholder="Buscar por nombre, cargo o email..." value={busquedaDir} onChange={e => setBusquedaDir(e.target.value)} style={{ ...inputStyle, width: 280 }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {DEPS_DIR.map(dep => (
                  <button key={dep} onClick={() => setFiltroDir(dep)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${filtroDir === dep ? accent : border}`, background: filtroDir === dep ? accent : 'transparent', color: filtroDir === dep ? 'white' : t2, cursor: 'pointer' }}>
                    {dep} {dep !== 'Todos' && <span style={{ opacity: .6 }}>{DIRECTORIO_DATA.filter(m => m.departamento === dep).length}</span>}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
                {dirFiltrado.map((m, i) => {
                  const ec = EMPRESA_COLORS[m.empresa] || accent
                  return (
                    <div key={i} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>{getIniciales(m.nombre)}</div>
                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: `${ec}20`, color: ec }}>{m.empresa.replace('Eminat ', '').replace(' by Eminat', '')}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: t1 }}>{m.nombre}{(m as any).credenciales && <span style={{ fontSize: 9, color: t3, marginLeft: 4 }}>{(m as any).credenciales}</span>}</div>
                      {(m as any).nickname && <div style={{ fontSize: 10, color: t3 }}>"{(m as any).nickname}"</div>}
                      <div style={{ fontSize: 11, color: t2, marginTop: 3 }}>{m.cargo}</div>
                      <div style={{ borderTop: `1px solid ${border}`, marginTop: 8, paddingTop: 8 }}>
                        <a href={`mailto:${m.email}`} style={{ fontSize: 10, color: accent, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✉ {m.email}</a>
                        <div style={{ fontSize: 10, color: t3, marginTop: 2 }}>{m.ubicacion}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ADMIN */}
          {vista === 'admin' && esSuperAdmin && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Total usuarios', value: adminUsuarios.length, color: accent },
                  { label: 'Activos', value: adminUsuarios.filter(u => u.activo && u.validado).length, color: '#34D399' },
                  { label: 'Pendientes', value: adminUsuarios.filter(u => !u.validado).length, color: '#FBB040' },
                  { label: 'Pasantes', value: adminUsuarios.filter(u => u.rol === 'pasante').length, color: '#60A5FA' },
                ].map(s => (
                  <div key={s.label} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px' }}>
                    <div style={{ fontFamily: 'Syne', fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: t3, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <input type="text" placeholder="Buscar..." value={busquedaAdmin} onChange={e => setBusquedaAdmin(e.target.value)} style={{ ...inputStyle, width: 220 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  {['todos', ...ROLES].map(r => (
                    <button key={r} onClick={() => setFiltroRolAdmin(r)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${filtroRolAdmin === r ? '#F87171' : border}`, background: filtroRolAdmin === r ? 'rgba(248,113,113,.15)' : 'transparent', color: filtroRolAdmin === r ? '#F87171' : t2, cursor: 'pointer' }}>{r}</button>
                  ))}
                </div>
              </div>
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: s2 }}>
                        {['Usuario', 'Email', 'Cargo', 'Empresa', 'Rol', 'Estado', 'Acciones'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adminFiltrado.map(u => (
                        <tr key={u.id} style={{ borderBottom: `1px solid ${border}` }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                                {u.nombre?.[0]}{u.apellido?.[0]}
                              </div>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>{u.nombre} {u.apellido}</div>
                                <div style={{ fontSize: 9, color: t3 }}>Tipo {u.tipo || 'B'} · {u.ubicacion || 'Ecuador'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>{u.email}</td>
                          <td style={{ padding: '10px 14px', fontSize: 11, color: t2 }}>{u.cargo || '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {u.empresa ? <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: `${EMPRESA_COLORS[u.empresa] || accent}20`, color: EMPRESA_COLORS[u.empresa] || accent }}>{u.empresa.replace('Eminat ', '').replace(' by Eminat', '')}</span> : <span style={{ fontSize: 10, color: t3 }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {u.rol === 'superadmin' ? (
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(248,113,113,.12)', color: '#F87171' }}>superadmin</span>
                            ) : (
                              <select value={u.rol} onChange={e => cambiarRol(u.id, e.target.value)} style={{ padding: '3px 8px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', outline: 'none' }}>
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {u.validado && u.activo ? <span style={{ fontSize: 11, color: '#34D399' }}>● Activo</span>
                              : !u.validado ? <span style={{ fontSize: 11, color: '#FBB040' }}>Pendiente</span>
                              : <span style={{ fontSize: 11, color: '#F87171' }}>Inactivo</span>}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              <button onClick={() => setModalEditar({ id: u.id, nombre: u.nombre || '', apellido: u.apellido || '', email: u.email || '', rol: u.rol || 'pasante', tipo: u.tipo || 'B', color: u.color || '#7C6FF7', ubicacion: u.ubicacion || 'Guayaquil, Ecuador', empresa: u.empresa || 'Eminat Holding' })}
                                style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: `1px solid rgba(124,111,247,.3)`, background: 'transparent', color: '#7C6FF7', cursor: 'pointer' }}>Editar</button>
                              <button onClick={() => resetPassword(u.email, u.nombre)}
                                style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: `1px solid rgba(96,165,250,.3)`, background: 'transparent', color: '#60A5FA', cursor: 'pointer' }}>Reset pwd</button>
                              {!u.validado && <button onClick={() => validarUsuario(u.id)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: `1px solid rgba(52,211,153,.3)`, background: 'transparent', color: '#34D399', cursor: 'pointer' }}>Validar</button>}
                              {u.rol !== 'superadmin' && <button onClick={() => toggleActivo(u.id, u.activo)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: `1px solid rgba(251,176,64,.3)`, background: 'transparent', color: '#FBB040', cursor: 'pointer' }}>{u.activo ? 'Desactivar' : 'Activar'}</button>}
                              {u.rol !== 'superadmin' && <button onClick={() => setModalEliminar(u.id)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: `1px solid rgba(248,113,113,.3)`, background: 'transparent', color: '#F87171', cursor: 'pointer' }}>Eliminar</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL VER ACTIVIDAD */}
      {modalVerAct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModalVerAct(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 500, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: `${getColorMarca(modalVerAct.area_ref)}25`, color: getColorMarca(modalVerAct.area_ref), fontWeight: 600 }}>{modalVerAct.area_ref}</span>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: `${ESTADO_COLORS[modalVerAct.estado] || t3}20`, color: ESTADO_COLORS[modalVerAct.estado] || t3 }}>{modalVerAct.estado}</span>
                </div>
                <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1, lineHeight: 1.3 }}>{modalVerAct.titulo}</div>
              </div>
              <button onClick={() => setModalVerAct(null)} style={{ background: 'none', border: 'none', color: t3, fontSize: 22, cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>✕</button>
            </div>
            {modalVerAct.descripcion && (
              <div style={{ marginBottom: 16, padding: '12px', background: s2, borderRadius: 10, fontSize: 13, color: t2, lineHeight: 1.5 }}>{modalVerAct.descripcion}</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Responsable', value: MIEMBROS_REFS[modalVerAct.responsable_ref] || modalVerAct.responsable_ref },
                { label: 'Solicitado por', value: SOLICITANTES.find(s => s.value === modalVerAct.solicitado_por)?.label || modalVerAct.solicitado_por || '—' },
                { label: 'Mes', value: modalVerAct.mes },
                { label: 'Trimestre', value: modalVerAct.trimestre || mesATrimestre(modalVerAct.mes || 'Enero') },
                { label: 'Horas estimadas', value: `${modalVerAct.horas || 0}h` },
                { label: 'Dias produccion', value: modalVerAct.dias_produccion || '0' },
                { label: 'Fecha entrega', value: modalVerAct.fecha_entrega ? new Date(modalVerAct.fecha_entrega + 'T00:00:00').toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'long' }) : 'Sin fecha' },
                { label: 'Verificado', value: modalVerAct.verificado ? '✓ Si' : '✕ No' },
              ].map(item => (
                <div key={item.label} style={{ background: s2, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: t3, marginBottom: 2, fontFamily: 'DM Mono', textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: t1 }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: t3, marginBottom: 8, fontFamily: 'DM Mono', textTransform: 'uppercase' }}>Cambiar estado</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLUMNAS_KANBAN.map(col => (
                  <button key={col} onClick={async () => {
                    await supabase.from('actividades').update({ estado: col }).eq('id', modalVerAct.id)
                    setActividades(prev => prev.map(a => a.id === modalVerAct.id ? { ...a, estado: col } : a))
                    setModalVerAct((p: any) => ({ ...p, estado: col }))
                    mostrarMensaje('ok', `Estado → "${col}"`)
                  }} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, border: `2px solid ${modalVerAct.estado === col ? ESTADO_COLORS[col] : border}`, background: modalVerAct.estado === col ? `${ESTADO_COLORS[col]}20` : 'transparent', color: modalVerAct.estado === col ? ESTADO_COLORS[col] : t2, cursor: 'pointer', fontWeight: modalVerAct.estado === col ? 700 : 400 }}>{col}</button>
                ))}
              </div>
            </div>
            {modalVerAct.drive_url && (
              <a href={modalVerAct.drive_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: `${accent}15`, color: accent, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                🔗 Ver carpeta en Google Drive
              </a>
            )}
          </div>
        </div>
      )}

      {/* MODAL NUEVA TAREA */}
      {modalNuevaAct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>Nueva tarea</div>
                <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>Completa los campos para agregar al Kanban</div>
              </div>
              <button onClick={() => setModalNuevaAct(false)} style={{ background: 'none', border: 'none', color: t3, fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>Titulo de la tarea <span style={{ color: '#F87171' }}>*</span></label>
              <input type="text" value={nuevaAct.titulo} onChange={e => setNuevaAct(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej. Disenar banner para EMC redes sociales" autoFocus style={{ ...inputStyle, fontSize: 14, padding: '11px 14px' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>Descripcion (opcional)</label>
              <textarea value={nuevaAct.descripcion} onChange={e => setNuevaAct(p => ({ ...p, descripcion: e.target.value }))} placeholder="Detalla que incluye esta tarea..." rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>🎨 Marca / Area <span style={{ color: '#F87171' }}>*</span></label>
                <select value={nuevaAct.area_ref} onChange={e => setNuevaAct(p => ({ ...p, area_ref: e.target.value }))} style={inputStyle}>
                  {MARCAS_LIST.map(a => <option key={a.codigo} value={a.codigo}>{a.codigo} — {a.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>👤 Responsable <span style={{ color: '#F87171' }}>*</span></label>
                <select value={nuevaAct.responsable_ref} onChange={e => setNuevaAct(p => ({ ...p, responsable_ref: e.target.value }))} style={inputStyle}>
                  {Object.entries(MIEMBROS_REFS).map(([ref, nombre]) => <option key={ref} value={ref}>{nombre}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>📨 Solicitado por</label>
              <select value={nuevaAct.solicitado_por} onChange={e => setNuevaAct(p => ({ ...p, solicitado_por: e.target.value }))} style={inputStyle}>
                {SOLICITANTES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>📅 Mes</label>
                <select value={nuevaAct.mes} onChange={e => setNuevaAct(p => ({ ...p, mes: e.target.value }))} style={inputStyle}>
                  {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>⏱ Horas estimadas</label>
                <input type="number" value={nuevaAct.horas} onChange={e => setNuevaAct(p => ({ ...p, horas: e.target.value }))} placeholder="0" min="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>📆 Dias prod.</label>
                <input type="number" value={nuevaAct.dias_produccion} onChange={e => setNuevaAct(p => ({ ...p, dias_produccion: e.target.value }))} placeholder="0" min="0" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>⚡ Estado inicial</label>
                <select value={nuevaAct.estado} onChange={e => setNuevaAct(p => ({ ...p, estado: e.target.value }))} style={inputStyle}>
                  {COLUMNAS_KANBAN.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>🗓 Fecha de entrega</label>
                <input type="date" value={nuevaAct.fecha_entrega} onChange={e => setNuevaAct(p => ({ ...p, fecha_entrega: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>🔗 Link Google Drive (opcional)</label>
              <input type="url" value={nuevaAct.drive_url} onChange={e => setNuevaAct(p => ({ ...p, drive_url: e.target.value }))} placeholder="https://drive.google.com/drive/folders/..." style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalNuevaAct(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={crearActividad} disabled={creandoAct || !nuevaAct.titulo.trim()} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: creandoAct || !nuevaAct.titulo.trim() ? t3 : accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: creandoAct || !nuevaAct.titulo.trim() ? 'not-allowed' : 'pointer' }}>
                {creandoAct ? '⏳ Creando...' : '✓ Crear tarea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR USUARIO */}
      {modalEditar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Editar usuario</div>
              <button onClick={() => setModalEditar(null)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Nombre</label><input type="text" value={modalEditar.nombre} onChange={e => setModalEditar((p: any) => ({ ...p, nombre: e.target.value }))} style={inputStyle} /></div>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Apellido</label><input type="text" value={modalEditar.apellido} onChange={e => setModalEditar((p: any) => ({ ...p, apellido: e.target.value }))} style={inputStyle} /></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Email (solo lectura)</label><input type="email" value={modalEditar.email} disabled style={{ ...inputStyle, opacity: .4 }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Rol</label><select value={modalEditar.rol} onChange={e => setModalEditar((p: any) => ({ ...p, rol: e.target.value }))} style={inputStyle}>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Tipo</label><select value={modalEditar.tipo} onChange={e => setModalEditar((p: any) => ({ ...p, tipo: e.target.value }))} style={inputStyle}><option value="A">Tipo A — Staff</option><option value="B">Tipo B — Pasante</option></select></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Empresa</label><select value={modalEditar.empresa} onChange={e => setModalEditar((p: any) => ({ ...p, empresa: e.target.value }))} style={inputStyle}>{EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Ubicacion</label><input type="text" value={modalEditar.ubicacion} onChange={e => setModalEditar((p: any) => ({ ...p, ubicacion: e.target.value }))} style={inputStyle} /></div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 8 }}>Color de avatar</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORES_AVATAR.map(c => (<div key={c} onClick={() => setModalEditar((p: any) => ({ ...p, color: c }))} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: modalEditar.color === c ? '3px solid white' : '2px solid transparent', boxSizing: 'border-box' }} />))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalEditar(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarEdicion} disabled={guardandoAdmin} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{guardandoAdmin ? 'Guardando...' : 'Guardar cambios'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR USUARIO */}
      {modalCrear && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Crear usuario</div>
              <button onClick={() => setModalCrear(false)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Nombre *</label><input type="text" value={nuevoUsr.nombre} onChange={e => setNuevoUsr(p => ({ ...p, nombre: e.target.value }))} style={inputStyle} /></div>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Apellido *</label><input type="text" value={nuevoUsr.apellido} onChange={e => setNuevoUsr(p => ({ ...p, apellido: e.target.value }))} style={inputStyle} /></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Email * (corporativo o gmail para pasantes)</label><input type="email" value={nuevoUsr.email} onChange={e => setNuevoUsr(p => ({ ...p, email: e.target.value }))} placeholder="usuario@eminat.net" style={inputStyle} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Contrasena temporal *</label><input type="password" value={nuevoUsr.password} onChange={e => setNuevoUsr(p => ({ ...p, password: e.target.value }))} placeholder="Min. 8 caracteres" style={inputStyle} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Rol</label><select value={nuevoUsr.rol} onChange={e => setNuevoUsr(p => ({ ...p, rol: e.target.value }))} style={inputStyle}>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Tipo</label><select value={nuevoUsr.tipo} onChange={e => setNuevoUsr(p => ({ ...p, tipo: e.target.value }))} style={inputStyle}><option value="A">Tipo A — Staff</option><option value="B">Tipo B — Pasante</option></select></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Empresa</label><select value={nuevoUsr.empresa} onChange={e => setNuevoUsr(p => ({ ...p, empresa: e.target.value }))} style={inputStyle}>{EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 8 }}>Color de avatar</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORES_AVATAR.map(c => (<div key={c} onClick={() => setNuevoUsr(p => ({ ...p, color: c }))} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: nuevoUsr.color === c ? '3px solid white' : '2px solid transparent', boxSizing: 'border-box' }} />))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalCrear(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={crearUsuario} disabled={guardandoAdmin} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: '#F87171', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{guardandoAdmin ? 'Creando...' : 'Crear usuario'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {modalEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: t1, marginBottom: 8 }}>Eliminar usuario</div>
            <div style={{ fontSize: 13, color: t2, marginBottom: 24, lineHeight: 1.5 }}>Esta accion es permanente y no se puede deshacer.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalEliminar(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => eliminarUsuario(modalEliminar)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#F87171', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes centerPulse { 0%, 100% { box-shadow: 0 0 40px rgba(124,111,247,.25), 0 0 80px rgba(124,111,247,.1); } 50% { box-shadow: 0 0 60px rgba(124,111,247,.4), 0 0 120px rgba(124,111,247,.2); } }
        @keyframes orbitRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .center-pulse > div { animation: centerPulse 3s ease-in-out infinite; }
        .orbit-ring { animation: orbitRotate 60s linear infinite; pointer-events: none; }
        .orbit-ring-inner { animation: orbitRotate 45s linear infinite reverse; pointer-events: none; }
        .brand-node:hover { filter: brightness(1.1); }
        * { scrollbar-width: thin; scrollbar-color: rgba(124,111,247,0.3) transparent; }
        *::-webkit-scrollbar { width: 4px; height: 4px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: rgba(124,111,247,0.3); border-radius: 2px; }

        @media (max-width: 768px) {
          .sidebar-root { position: fixed !important; left: 0; top: 0; bottom: 0; transform: translateX(-100%); transition: transform .25s ease; }
          .sidebar-root.open { transform: translateX(0); }
          .mobile-hamburger { display: flex !important; }
        }

        @media print {
          aside { display: none !important; }
          main > div:first-child { display: none !important; }
          #reporte-controls { display: none !important; }
          body, html { background: white !important; }
          main { overflow: visible !important; }
          #print-header { display: block !important; }
          #reporte-content { color: #111 !important; }
          #reporte-content * { color: #111 !important; border-color: #ccc !important; }
          #reporte-content div[style*="background"] { background: #f9f9f9 !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}


                                         
