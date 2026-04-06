'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ============ CONSTANTES ============
const TRIMESTRES = ['General', 'Q1', 'Q2', 'Q3', 'Q4']
const MESES_Q: Record<string, string[]> = {
  General: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  Q1: ['Enero','Febrero','Marzo'],
  Q2: ['Abril','Mayo','Junio'],
  Q3: ['Julio','Agosto','Septiembre'],
  Q4: ['Octubre','Noviembre','Diciembre'],
}
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MARCAS_LIST = [
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
const ROLES = ['pasante', 'colaborador', 'coordinador', 'superadmin']
const COLORES_AVATAR = ['#7C6FF7', '#34D399', '#F472B6', '#60A5FA', '#FB923C', '#FBB040', '#A78BFA', '#F87171']
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
  'david@eminat.net': 'Graphic Designer and Animations',
  'jonathan@eminat.net': 'CRM Developer / Full Stack Developer',
  'ariana@eminat.net': 'Graphic Designer (Pasante)',
  'naomi@eminat.net': 'Community Manager (Pasante)',
  'bryan@eminat.net': 'Video Editor (Pasante)',
  'javier@emc.health': 'COO / Medical Director',
  'ceo@eminat.net': 'CEO',
  'javier@eminat.net': 'COO',
  'dmsardina@eminat.net': 'Director of Clinical Research Operations',
  'daniel@eminat.net': 'Director of Medical Center Operations',
  'ntorres@eminat.net': 'Finance and Administrative Director',
  'erick@eminat.net': 'Business Development Director',
  'raul@eminat.net': 'Director of Digital Transformation',
  'ivannia@eminat.net': 'Eminat Premier Manager',
  'majo@eminat.net': 'Accounting and Revenue Operations Lead',
  'ana@eminat.net': 'Accounting and Revenue Operations Coordinator',
  'landrade@eminat.net': 'Latin America Operations Manager',
  'randrade@eminat.net': 'Head of Partnerships',
  'lsalazar@eminat.net': 'Senior Clinical Research Coordinator',
  'diana@eminat.net': 'Senior Clinical Research Coordinator',
  'lcruz@eminat.net': 'Clinical Research Coordinator',
  'federico@eminat.net': 'Business Development Associate',
  'lina@eminat.net': 'Business Development Associate',
  'luis@eminat.net': 'Digital Transformation Consultant',
  'wagner@eminat.net': 'AI Developer',
  'giuliana@vivinegretefoundation.org': 'Operations Coordinator',
  'guisella@eminat.net': 'Patient Recruitment and Retention Coordinator',
  'gnegrete@eminat.net': 'Patient Recruitment and Retention Coordinator',
}

const DIRECTORIO_DATA = [
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

function getIniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
}

// ============ MAIN APP ============
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
  const router = useRouter()

  // Dashboard state
  const [trimestre, setTrimestre] = useState('General')

  // MKT state
  const [mktTab, setMktTab] = useState('kanban')
  const [mesKanban, setMesKanban] = useState('')
  const [mesHoras, setMesHoras] = useState('')
  const [mesReporte, setMesReporte] = useState(MESES[new Date().getMonth()])
  const [miembroReporte, setMiembroReporte] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [guardandoKanban, setGuardandoKanban] = useState(false)
  const [modalNuevaAct, setModalNuevaAct] = useState(false)
  const [nuevaAct, setNuevaAct] = useState({ titulo: '', area_ref: 'EMC', responsable_ref: 'DG_Joselyn', mes: MESES[new Date().getMonth()], horas: '', dias_produccion: '', estado: 'Pendiente', fecha_entrega: '' })

  // Solicitudes state
  const [busquedaSol, setBusquedaSol] = useState('')
  const [filtroEstadoSol, setFiltroEstadoSol] = useState('Todos')

  // Directorio state
  const [busquedaDir, setBusquedaDir] = useState('')
  const [filtroDir, setFiltroDir] = useState('Todos')

  // Admin state
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
    }

    const esSA = usr?.rol === 'superadmin' || usr?.rol === 'coordinador'
    let q = supabase.from('actividades').select('*').order('fecha_entrega', { ascending: false })
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

  // ============ TEMA ============
  const bg = dark ? '#0A0A0F' : '#F5F5F7'
  const s1 = dark ? '#111118' : '#FFFFFF'
  const s2 = dark ? '#1A1A24' : '#F0F0F5'
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const t1 = dark ? '#FFFFFF' : '#0A0A0F'
  const t2 = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'
  const t3 = dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'
  const accent = '#7C6FF7'
  const esSuperAdmin = usuario?.rol === 'superadmin' || usuario?.rol === 'coordinador'
  const cargo = usuario?.rol === 'superadmin' ? 'Coordinador de Marketing' : usuario?.rol || 'Colaborador'

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 9, border: `1px solid ${border}`,
    background: s2, color: t1, fontSize: 13, fontFamily: 'DM Sans', outline: 'none',
    width: '100%', boxSizing: 'border-box'
  }

  // ============ COMPUTED ============
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

  const mesesGrafico = trimestre === 'General' ? ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'] : mesesQ.map(m => m.slice(0, 3))
  const mesesFull = trimestre === 'General' ? MESES_Q['General'] : mesesQ
  const datosPorMes = mesesFull.map((mes, i) => ({
    mes: mesesGrafico[i],
    total: actividades.filter(a => a.mes === mes).length,
    completadas: actividades.filter(a => a.mes === mes && a.estado === 'Completado').length,
  }))
  const maxTotal = Math.max(...datosPorMes.map(d => d.total), 1)

  const datosPorMarca = MARCAS_LIST.map(m => ({
    ...m,
    total: actsFiltradas.filter(a => a.area_ref === m.codigo).length,
  })).filter(m => m.total > 0)
  const maxMarca = Math.max(...datosPorMarca.map(d => d.total), 1)

  const refsTeam = esSuperAdmin ? Object.keys(MIEMBROS_REFS) : [usuario?.responsable_ref].filter(Boolean)
  const datosPorMiembro = refsTeam.map(ref => ({
    ref,
    nombre: MIEMBROS_REFS[ref] || ref,
    total: actsFiltradas.filter(a => a.responsable_ref === ref).length,
    completadas: actsFiltradas.filter(a => a.responsable_ref === ref && a.estado === 'Completado').length,
    horas: Math.round(actsFiltradas.filter(a => a.responsable_ref === ref).reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10,
  })).filter(d => d.total > 0).sort((a, b) => b.total - a.total)
  const maxMiembro = Math.max(...datosPorMiembro.map(d => d.total), 1)

  // Kanban
  const mesesDisponibles = actividades.map(a => a.mes).filter(Boolean).filter((m, i, arr) => arr.indexOf(m) === i)
  const actsKanban = mesKanban ? actividades.filter(a => a.mes === mesKanban) : actividades
  const porColumna = (col: string) => actsKanban.filter(a => a.estado === col)

  // Horas
  const actsHoras = mesHoras ? actividades.filter(a => a.mes === mesHoras) : actividades
  const resumenHoras = refsTeam.map(ref => {
    const acts = actsHoras.filter(a => a.responsable_ref === ref)
    return {
      ref, nombre: MIEMBROS_REFS[ref] || ref,
      total: acts.length,
      completadas: acts.filter(a => a.estado === 'Completado').length,
      horas: Math.round(acts.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10,
      dias: acts.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0),
    }
  }).filter(r => r.total > 0)

  // Reporte
  const refRep = miembroReporte || refsTeam[0] || ''
  const actsRep = actividades.filter(a => {
    const matchMes = a.mes === mesReporte
    if (refRep === 'Coord_MFreddy') return matchMes && (a.responsable_ref === refRep || a.solicitado_por === refRep)
    return matchMes && a.responsable_ref === refRep
  })
  const totalHorasRep = Math.round(actsRep.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10
  const totalDiasRep = actsRep.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0)
  const completadasRep = actsRep.filter(a => a.estado === 'Completado').length
  const nombreRep = MIEMBROS_REFS[refRep] || usuario?.nombre || refRep

  // Directorio
  const DEPS_DIR = ['Todos', 'Leadership', 'Directors', 'Finance', 'Business Dev', 'Research', 'Medical', 'Marketing', 'Digital & AI', 'VNF']
  const dirFiltrado = DIRECTORIO_DATA
    .filter(m => filtroDir === 'Todos' || m.departamento === filtroDir)
    .filter(m => busquedaDir === '' || m.nombre.toLowerCase().includes(busquedaDir.toLowerCase()) || m.cargo.toLowerCase().includes(busquedaDir.toLowerCase()) || m.email.toLowerCase().includes(busquedaDir.toLowerCase()))

  // Admin
  const adminFiltrado = adminUsuarios
    .filter(u => filtroRolAdmin === 'todos' || u.rol === filtroRolAdmin)
    .filter(u => busquedaAdmin === '' || `${u.nombre} ${u.apellido}`.toLowerCase().includes(busquedaAdmin.toLowerCase()) || u.email?.toLowerCase().includes(busquedaAdmin.toLowerCase()))

  // ============ KANBAN DRAG ============
  function onDragStart(id: string) { setDragId(id) }
  function onDragOver(e: React.DragEvent) { e.preventDefault() }
  async function onDrop(e: React.DragEvent, nuevoEstado: string) {
    e.preventDefault()
    if (!dragId) return
    const act = actividades.find(a => a.id === dragId)
    if (!act || act.estado === nuevoEstado) { setDragId(null); return }
    setGuardandoKanban(true)
    await supabase.from('actividades').update({ estado: nuevoEstado }).eq('id', dragId)
    setActividades(prev => prev.map(a => a.id === dragId ? { ...a, estado: nuevoEstado } : a))
    setDragId(null)
    setGuardandoKanban(false)
    mostrarMensaje('ok', `Movido a ${nuevoEstado}`)
  }

  // ============ NUEVA ACTIVIDAD ============
  async function crearActividad() {
    if (!nuevaAct.titulo) { mostrarMensaje('error', 'El titulo es obligatorio'); return }
    const { data, error } = await supabase.from('actividades').insert({
      titulo: nuevaAct.titulo,
      area_ref: nuevaAct.area_ref,
      responsable_ref: nuevaAct.responsable_ref,
      mes: nuevaAct.mes,
      horas: Number(nuevaAct.horas) || 0,
      dias_produccion: Number(nuevaAct.dias_produccion) || 0,
      estado: nuevaAct.estado,
      fecha_entrega: nuevaAct.fecha_entrega || null,
      trimestre: 'Q2',
    }).select().single()
    if (error) { mostrarMensaje('error', 'Error al crear la actividad'); return }
    setActividades(prev => [data, ...prev])
    setModalNuevaAct(false)
    setNuevaAct({ titulo: '', area_ref: 'EMC', responsable_ref: 'DG_Joselyn', mes: MESES[new Date().getMonth()], horas: '', dias_produccion: '', estado: 'Pendiente', fecha_entrega: '' })
    mostrarMensaje('ok', 'Actividad creada correctamente')
  }

  // ============ ADMIN FUNCIONES ============
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
    else mostrarMensaje('ok', `Email de recuperacion enviado a ${nombre}`)
  }
  async function crearUsuario() {
    if (!nuevoUsr.nombre || !nuevoUsr.apellido || !nuevoUsr.email || !nuevoUsr.password) { mostrarMensaje('error', 'Completa todos los campos'); return }
    setGuardandoAdmin(true)
    const { data: signUpData, error } = await supabase.auth.signUp({ email: nuevoUsr.email, password: nuevoUsr.password })
    if (error) { mostrarMensaje('error', error.message); setGuardandoAdmin(false); return }
    const uid = signUpData?.user?.id
    if (uid) {
      await supabase.from('usuarios').upsert({ id: uid, nombre: nuevoUsr.nombre, apellido: nuevoUsr.apellido, email: nuevoUsr.email, rol: nuevoUsr.rol, tipo: nuevoUsr.tipo, color: nuevoUsr.color, empresa: nuevoUsr.empresa, cargo: CARGOS_DIR[nuevoUsr.email.toLowerCase()] || '', activo: true, validado: true, ubicacion: 'Guayaquil, Ecuador' })
    }
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F' }}>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.28)' }}>Cargando Eminat App...</div>
    </div>
  )

  // ============ NAV ITEMS ============
  const navItems = [
    { key: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { key: 'mkt', icon: '🚀', label: 'Eminat MKT' },
    { key: 'solicitudes', icon: '📋', label: 'Solicitudes' },
    { key: 'equipo', icon: '👥', label: 'Equipo' },
    { key: 'directorio', icon: '🏢', label: 'Directorio' },
    ...(esSuperAdmin ? [{ key: 'admin', icon: '🔐', label: 'Admin' }] : []),
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', background: bg, color: t1, fontFamily: 'DM Sans, sans-serif', transition: 'background .3s' }}>

      {/* ============ SIDEBAR ============ */}
      <aside style={{ width: 220, background: s1, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'background .3s' }}>
        <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: t1 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, boxShadow: `0 0 10px ${accent}` }} />
            eminat app
          </div>
        </div>

        <nav style={{ padding: '10px 7px', overflowY: 'auto', flex: 1 }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => setVista(item.key)} style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', width: '100%',
              borderRadius: 10, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', textAlign: 'left',
              color: vista === item.key ? accent : t2,
              background: vista === item.key ? `${accent}18` : 'transparent', marginBottom: 1,
            }}><span>{item.icon}</span>{item.label}</button>
          ))}

          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.1em', padding: '12px 8px 5px' }}>Marcas</div>
          {MARCAS_LIST.map(a => (
            <div key={a.codigo} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 10, fontSize: 13, color: t2, cursor: 'pointer', marginBottom: 1 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: a.color }} />
              {a.codigo}
            </div>
          ))}

          {/* TARJETA USUARIO */}
          <div style={{ margin: '12px 4px 0', padding: '12px', borderRadius: 12, background: `${accent}10`, border: `1px solid ${accent}25` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: usuario?.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
                  {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: '#34D399', border: `2px solid ${s1}` }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.nombre} {usuario?.apellido}</div>
                <div style={{ fontSize: 10, color: accent, fontWeight: 500 }}>{cargo}</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: t3, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <span>📍</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.ubicacion || 'Guayaquil, Ecuador'}</span>
            </div>
            <button onClick={handleLogout} style={{ width: '100%', padding: '6px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t3, fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans' }}>
              Sign out
            </button>
          </div>
        </nav>
      </aside>

      {/* ============ MAIN ============ */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* TOPBAR */}
        <div style={{ padding: '12px 24px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: s1, position: 'sticky', top: 0, zIndex: 10, transition: 'background .3s' }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: t1 }}>
              {vista === 'dashboard' && `Buen dia, ${usuario?.nombre} 👋`}
              {vista === 'mkt' && 'Eminat MKT'}
              {vista === 'solicitudes' && 'Solicitudes'}
              {vista === 'equipo' && 'Equipo'}
              {vista === 'directorio' && 'Directorio'}
              {vista === 'admin' && 'Admin Panel'}
            </div>
            <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', marginTop: 1 }}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {horaActual}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mensaje && (
              <div style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, background: mensaje.tipo === 'ok' ? 'rgba(52,211,153,.15)' : 'rgba(248,113,113,.15)', color: mensaje.tipo === 'ok' ? '#34D399' : '#F87171', border: `1px solid ${mensaje.tipo === 'ok' ? '#34D39940' : '#F8717140'}` }}>
                {mensaje.tipo === 'ok' ? '✓' : '✕'} {mensaje.texto}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: '#34D39915', border: '1px solid #34D39940' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
              <span style={{ fontSize: 11, color: '#34D399', fontWeight: 500 }}>{onlineCount > 0 ? onlineCount : 1} online</span>
            </div>
            <button onClick={() => setDark(!dark)} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer' }}>
              {dark ? '☀️' : '🌙'}
            </button>
            {vista === 'mkt' && (
              <button onClick={() => setModalNuevaAct(true)} style={{ padding: '6px 14px', borderRadius: 10, background: accent, color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                + Nueva actividad
              </button>
            )}
            {esSuperAdmin && vista === 'admin' && (
              <button onClick={() => setModalCrear(true)} style={{ padding: '6px 14px', borderRadius: 10, background: '#F87171', color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                + Crear usuario
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '18px 24px', flex: 1, overflow: 'auto' }}>

          {/* ============================= DASHBOARD ============================= */}
          {vista === 'dashboard' && (
            <div>
              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}`, paddingBottom: 0 }}>
                {[{ key: 'overview', label: '📊 Overview' }, { key: 'directory', label: '🏢 Directory' }].map(t => (
                  <button key={t.key} onClick={() => setSubVista(t.key)} style={{
                    padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent',
                    color: subVista === t.key ? t1 : t3,
                    borderBottom: subVista === t.key ? `2px solid ${accent}` : '2px solid transparent',
                  }}>{t.label}</button>
                ))}
              </div>

              {subVista === 'overview' && (
                <div>
                  {/* Trimestre */}
                  <div style={{ display: 'flex', gap: 5, marginBottom: 16, alignItems: 'center' }}>
                    {TRIMESTRES.map(q => (
                      <button key={q} onClick={() => setTrimestre(q)} style={{
                        padding: '5px 16px', borderRadius: 20, border: `1px solid ${trimestre === q ? accent : border}`,
                        background: trimestre === q ? accent : 'transparent', color: trimestre === q ? 'white' : t2,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
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
                        <div style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, lineHeight: 1, color: k.color }}>{k.value}</div>
                        <div style={{ fontSize: 9, color: t3, marginTop: 6 }}>{k.sub}</div>
                        <div style={{ marginTop: 8, height: 2, borderRadius: 1, background: border }}>
                          <div style={{ height: 2, borderRadius: 1, background: k.color, width: `${pctCompletado}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Graficos */}
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
                              <div style={{ height: '100%', borderRadius: 3, background: m.color, width: `${(m.total / maxMarca) * 100}%` }} />
                            </div>
                            <span style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', width: 28, textAlign: 'right' }}>{m.total}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 12 }}>
                        {[
                          { label: 'Completed', value: pctCompletado, color: '#34D399' },
                          { label: 'In Progress', value: totalQ > 0 ? Math.round((enProcesoQ / totalQ) * 100) : 0, color: accent },
                          { label: 'Pending', value: totalQ > 0 ? Math.round((pendientesQ / totalQ) * 100) : 0, color: '#9494B3' },
                        ].map(s => (
                          <div key={s.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Syne', color: s.color }}>{s.value}%</div>
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
                        <div style={{ fontSize: 10, color: '#34D399', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
                          {onlineCount > 0 ? onlineCount : 1} online
                        </div>
                      </div>
                      <div style={{ overflowY: 'auto', maxHeight: 200 }}>
                        {equipoSinMi.map(u => {
                          const userInfo = usuarios.find(us => us.nombre === u.nombre)
                          const isOnline = userInfo?.online_at ? new Date(userInfo.online_at) > new Date(Date.now() - 5 * 60 * 1000) : false
                          return (
                            <div key={u.id} style={{ padding: '8px 14px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 9 }}>
                              <div style={{ position: 'relative', flexShrink: 0 }}>
                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: u.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white' }}>
                                  {u.nombre?.[0]}{u.apellido?.[0]}
                                </div>
                                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 7, height: 7, borderRadius: '50%', background: isOnline ? '#34D399' : '#9494B3', border: `2px solid ${s1}` }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: t1 }}>{u.nombre}</div>
                                <div style={{ fontSize: 9, color: isOnline ? '#34D399' : t3 }}>
                                  {isOnline ? '● Active now' : 'Offline'}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Actividades + Ranking */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
                    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Actividades recientes</div>
                          <div style={{ fontSize: 9, color: t3, marginTop: 1 }}>{trimestre}</div>
                        </div>
                        <button onClick={() => setVista('solicitudes')} style={{ fontSize: 10, color: accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Ver todas →</button>
                      </div>
                      {actsFiltradas.slice(0, 7).map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${border}` }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: ESTADO_COLORS[a.estado] || t3, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titulo}</div>
                            <div style={{ fontSize: 9, color: t3, marginTop: 1 }}>{a.area_ref} · {a.responsable_ref} · {a.mes}</div>
                          </div>
                          <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 9, background: `${ESTADO_COLORS[a.estado] || t3}20`, color: ESTADO_COLORS[a.estado] || t3, whiteSpace: 'nowrap', flexShrink: 0 }}>
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
                              <div style={{ display: 'flex', gap: 8 }}>
                                <span style={{ fontSize: 9, color: '#34D399', fontFamily: 'DM Mono' }}>{m.completadas}✓</span>
                                <span style={{ fontSize: 9, color: t3, fontFamily: 'DM Mono' }}>{m.horas}h</span>
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

              {subVista === 'directory' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Syne', color: t1 }}>Eminat Holding Directory</div>
                      <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>{DIRECTORIO_DATA.length} members</div>
                    </div>
                    <input type="text" placeholder="Search..." value={busquedaDir} onChange={e => setBusquedaDir(e.target.value)}
                      style={{ ...inputStyle, width: 240 }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {DEPS_DIR.map(dep => (
                      <button key={dep} onClick={() => setFiltroDir(dep)} style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: `1px solid ${filtroDir === dep ? accent : border}`,
                        background: filtroDir === dep ? accent : 'transparent', color: filtroDir === dep ? 'white' : t2,
                      }}>{dep}</button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                    {dirFiltrado.map((m, i) => {
                      const ec = EMPRESA_COLORS[m.empresa] || '#7C6FF7'
                      return (
                        <div key={i} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
                              {getIniciales(m.nombre)}
                            </div>
                            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: `${ec}20`, color: ec, fontWeight: 600 }}>
                              {m.empresa.replace('Eminat ', '').replace(' by Eminat', '')}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: t1 }}>{m.nombre}</div>
                          {(m as any).nickname && <div style={{ fontSize: 10, color: t3, marginTop: 1 }}>"{(m as any).nickname}"</div>}
                          <div style={{ fontSize: 11, color: t2, marginTop: 4 }}>{m.cargo}</div>
                          <div style={{ borderTop: `1px solid ${border}`, marginTop: 8, paddingTop: 8 }}>
                            <a href={`mailto:${m.email}`} style={{ fontSize: 10, color: accent, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✉ {m.email}</a>
                            <div style={{ fontSize: 10, color: t3, marginTop: 3 }}>{m.ubicacion === 'USA' ? 'US' : 'EC'} {m.ubicacion}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================= EMINAT MKT ============================= */}
          {vista === 'mkt' && (
            <div>
              {/* MKT Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}` }}>
                {[{ key: 'kanban', label: '⚡ Kanban' }, { key: 'horas', label: '⏱ Horas' }, { key: 'reporte', label: '💰 Reporte' }].map(t => (
                  <button key={t.key} onClick={() => setMktTab(t.key)} style={{
                    padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent',
                    color: mktTab === t.key ? t1 : t3,
                    borderBottom: mktTab === t.key ? `2px solid ${accent}` : '2px solid transparent',
                  }}>{t.label}</button>
                ))}
              </div>

              {/* KANBAN */}
              {mktTab === 'kanban' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Pipeline de produccion</span>
                      <span style={{ fontSize: 11, color: t3, marginLeft: 8 }}>Arrastra para cambiar estado</span>
                      {guardandoKanban && <span style={{ fontSize: 11, color: '#FBB040', marginLeft: 8 }}>Guardando...</span>}
                    </div>
                    <select value={mesKanban} onChange={e => setMesKanban(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
                      <option value="">Todos los meses</option>
                      {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {COLUMNAS_KANBAN.map(col => (
                      <div key={col} onDragOver={onDragOver} onDrop={e => onDrop(e, col)}
                        style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', minHeight: 500, borderTop: `3px solid ${ESTADO_COLORS[col] || t3}` }}>
                        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: ESTADO_COLORS[col] || t1 }}>{col}</span>
                          <span style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', background: s2, padding: '2px 7px', borderRadius: 10 }}>{porColumna(col).length}</span>
                        </div>
                        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
                          {porColumna(col).map(a => (
                            <div key={a.id} draggable onDragStart={() => onDragStart(a.id)}
                              style={{ background: s2, borderRadius: 10, padding: '10px 12px', border: `1px solid ${dragId === a.id ? accent : border}`, cursor: 'grab', opacity: dragId === a.id ? .5 : 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: t1, lineHeight: 1.4, marginBottom: 6 }}>{a.titulo}</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 9, color: t3 }}>{esSuperAdmin ? a.responsable_ref : a.mes}</span>
                                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 6, background: `${accent}20`, color: accent }}>{a.area_ref}</span>
                              </div>
                              {a.fecha_entrega && <div style={{ fontSize: 9, color: t3, marginTop: 4 }}>📅 {new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString('es-EC')}</div>}
                            </div>
                          ))}
                          {porColumna(col).length === 0 && (
                            <div style={{ border: `2px dashed ${border}`, borderRadius: 10, padding: '24px', textAlign: 'center', color: t3, fontSize: 11 }}>Arrastra aqui</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* HORAS */}
              {mktTab === 'horas' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Resumen de horas — {esSuperAdmin ? 'Todo el equipo' : 'Tus horas'}</span>
                    <select value={mesHoras} onChange={e => setMesHoras(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
                      <option value="">Todos los meses</option>
                      {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {resumenHoras.map(r => (
                      <div key={r.ref} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{r.nombre}</div>
                            <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', marginTop: 2 }}>{r.ref}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: '#60A5FA', lineHeight: 1 }}>{r.horas}h</div>
                            <div style={{ fontSize: 10, color: t3, marginTop: 2 }}>{r.dias} dias prod.</div>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
                          {[
                            { label: 'Total tareas', value: r.total, color: t1 },
                            { label: 'Completadas', value: r.completadas, color: '#34D399' },
                            { label: 'Efectividad', value: `${r.total > 0 ? Math.round((r.completadas / r.total) * 100) : 0}%`, color: accent },
                          ].map(s => (
                            <div key={s.label} style={{ background: s2, borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne', color: s.color }}>{s.value}</div>
                              <div style={{ fontSize: 10, color: t3, marginTop: 2 }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: border, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: '#34D399', width: `${r.total > 0 ? (r.completadas / r.total) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* REPORTE */}
              {mktTab === 'reporte' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Reporte de produccion mensual</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {esSuperAdmin && (
                        <select value={miembroReporte} onChange={e => setMiembroReporte(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
                          <option value="">Seleccionar miembro</option>
                          {Object.entries(MIEMBROS_REFS).map(([ref, nombre]) => <option key={ref} value={ref}>{nombre}</option>)}
                        </select>
                      )}
                      <select value={mesReporte} onChange={e => setMesReporte(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
                        {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <button onClick={() => window.print()} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${border}`, background: accent, color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Imprimir
                      </button>
                    </div>
                  </div>
                  <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '24px 28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div>
                        <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Reporte de Produccion</div>
                        <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>Holding Eminat — Departamento de Marketing</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: t3 }}>Periodo</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{mesReporte} 2026</div>
                      </div>
                    </div>
                    <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14, marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Colaborador</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: t1 }}>{nombreRep}</div>
                      <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', marginTop: 2 }}>{refRep}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
                      {[
                        { label: 'Total tareas', value: actsRep.length, color: accent },
                        { label: 'Completadas', value: completadasRep, color: '#34D399' },
                        { label: 'Horas totales', value: `${totalHorasRep}h`, color: '#F472B6' },
                        { label: 'Dias produccion', value: totalDiasRep, color: '#60A5FA' },
                      ].map(s => (
                        <div key={s.label} style={{ background: s2, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                          <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: 10, color: t3, marginTop: 4 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: s2 }}>
                          {['Tarea', 'Area', 'Horas', 'Dias', 'Estado'].map(h => (
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
                    {actsRep.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: t3 }}>No hay tareas para este periodo</div>}
                    <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ borderTop: `1px solid ${border}`, paddingTop: 8, fontSize: 11, color: t3 }}>Firma del colaborador</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ borderTop: `1px solid ${border}`, paddingTop: 8, fontSize: 11, color: t3 }}>Firma del coordinador</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================= SOLICITUDES ============================= */}
          {vista === 'solicitudes' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Syne', color: t1 }}>Solicitudes</div>
                <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>{esSuperAdmin ? `${actividades.length} actividades totales` : `Tus actividades`}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <input type="text" placeholder="Buscar por titulo, area o responsable..." value={busquedaSol} onChange={e => setBusquedaSol(e.target.value)} style={{ ...inputStyle, width: 300 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Todos', 'Pendiente', 'En proceso', 'Por aprobar', 'Completado'].map(e => (
                    <button key={e} onClick={() => setFiltroEstadoSol(e)} style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: `1px solid ${filtroEstadoSol === e ? accent : border}`,
                      background: filtroEstadoSol === e ? accent : 'transparent', color: filtroEstadoSol === e ? 'white' : t2,
                    }}>{e}</button>
                  ))}
                </div>
              </div>
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: s2 }}>
                        {['Titulo', 'Area', ...(esSuperAdmin ? ['Responsable'] : []), 'Mes', 'Horas', 'Estado', 'Entrega'].map(h => (
                          <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {actividades
                        .filter(a => filtroEstadoSol === 'Todos' || a.estado === filtroEstadoSol)
                        .filter(a => busquedaSol === '' || a.titulo?.toLowerCase().includes(busquedaSol.toLowerCase()) || a.area_ref?.toLowerCase().includes(busquedaSol.toLowerCase()))
                        .map(a => (
                          <tr key={a.id} style={{ borderBottom: `1px solid ${border}` }}>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: t1 }}>{a.titulo}</div>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${accent}20`, color: accent }}>{a.area_ref}</span>
                            </td>
                            {esSuperAdmin && <td style={{ padding: '10px 14px', fontSize: 11, color: t3 }}>{a.responsable_ref}</td>}
                            <td style={{ padding: '10px 14px', fontSize: 11, color: t3 }}>{a.mes}</td>
                            <td style={{ padding: '10px 14px', fontSize: 11, color: t3, fontFamily: 'DM Mono' }}>{a.horas}h</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${ESTADO_COLORS[a.estado] || t3}20`, color: ESTADO_COLORS[a.estado] || t3 }}>{a.estado}</span>
                            </td>
                            <td style={{ padding: '10px 14px', fontSize: 11, color: t3 }}>
                              {a.fecha_entrega ? new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString('es-EC') : '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================= EQUIPO ============================= */}
          {vista === 'equipo' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Syne', color: t1 }}>Equipo de Marketing</div>
                <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>Holding Eminat — {usuarios.length} miembros registrados</div>
              </div>
              {['A', 'B'].map(tipo => {
                const miembros = usuarios.filter(u => u.tipo === tipo || (!u.tipo && tipo === 'A'))
                if (miembros.length === 0) return null
                return (
                  <div key={tipo} style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: accent, marginBottom: 12, padding: '4px 10px', background: `${accent}15`, borderRadius: 20, display: 'inline-block' }}>
                      Tipo {tipo} — {tipo === 'A' ? 'Staff Creativo' : 'Internos'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                      {miembros.map(u => {
                        const isOnline = u.online_at ? new Date(u.online_at) > new Date(Date.now() - 5 * 60 * 1000) : false
                        return (
                          <div key={u.id} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                              <div style={{ width: 44, height: 44, borderRadius: '50%', background: u.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>
                                {u.nombre?.[0]}{u.apellido?.[0]}
                              </div>
                              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: isOnline ? '#34D399' : '#9494B3', border: `2px solid ${s1}` }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: t1 }}>{u.nombre} {u.apellido}</div>
                              <div style={{ fontSize: 11, color: t2, marginTop: 1 }}>{u.cargo || CARGOS_DIR[u.email?.toLowerCase()] || u.rol}</div>
                              <div style={{ fontSize: 10, color: t3, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ============================= DIRECTORIO ============================= */}
          {vista === 'directorio' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Syne', color: t1 }}>Eminat Holding Directory</div>
                  <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>{DIRECTORIO_DATA.length} members across all companies</div>
                </div>
                <input type="text" placeholder="Search..." value={busquedaDir} onChange={e => setBusquedaDir(e.target.value)} style={{ ...inputStyle, width: 260 }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {DEPS_DIR.map(dep => (
                  <button key={dep} onClick={() => setFiltroDir(dep)} style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                    border: `1px solid ${filtroDir === dep ? accent : border}`,
                    background: filtroDir === dep ? accent : 'transparent', color: filtroDir === dep ? 'white' : t2,
                  }}>{dep} {dep !== 'Todos' && <span style={{ opacity: .6, fontSize: 10 }}>{DIRECTORIO_DATA.filter(m => m.departamento === dep).length}</span>}</button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
                {dirFiltrado.map((m, i) => {
                  const ec = EMPRESA_COLORS[m.empresa] || '#7C6FF7'
                  return (
                    <div key={i} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
                          {getIniciales(m.nombre)}
                        </div>
                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: `${ec}20`, color: ec, fontWeight: 600 }}>
                          {m.empresa.replace('Eminat ', '').replace(' by Eminat', '')}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: t1 }}>{m.nombre}{(m as any).credenciales && <span style={{ fontSize: 9, color: t3, fontWeight: 400, marginLeft: 4 }}>{(m as any).credenciales}</span>}</div>
                      {(m as any).nickname && <div style={{ fontSize: 10, color: t3, marginTop: 1 }}>"{(m as any).nickname}"</div>}
                      <div style={{ fontSize: 11, color: t2, marginTop: 4 }}>{m.cargo}</div>
                      <div style={{ borderTop: `1px solid ${border}`, marginTop: 8, paddingTop: 8 }}>
                        <a href={`mailto:${m.email}`} style={{ fontSize: 10, color: accent, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✉ {m.email}</a>
                        <div style={{ fontSize: 10, color: t3, marginTop: 3 }}>{m.ubicacion === 'USA' ? 'US' : 'EC'} {m.ubicacion}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ============================= ADMIN ============================= */}
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
                <input type="text" placeholder="Buscar..." value={busquedaAdmin} onChange={e => setBusquedaAdmin(e.target.value)} style={{ ...inputStyle, width: 240 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  {['todos', ...ROLES].map(r => (
                    <button key={r} onClick={() => setFiltroRolAdmin(r)} style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                      border: `1px solid ${filtroRolAdmin === r ? '#F87171' : border}`,
                      background: filtroRolAdmin === r ? 'rgba(248,113,113,.2)' : 'transparent',
                      color: filtroRolAdmin === r ? '#F87171' : t2,
                    }}>{r}</button>
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
                                <div style={{ fontSize: 9, color: t3 }}>{u.ubicacion || 'Ecuador'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>{u.email}</td>
                          <td style={{ padding: '10px 14px', fontSize: 11, color: t2 }}>{u.cargo || '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {u.empresa ? (
                              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: `${EMPRESA_COLORS[u.empresa] || accent}20`, color: EMPRESA_COLORS[u.empresa] || accent }}>{u.empresa.replace('Eminat ', '').replace(' by Eminat', '')}</span>
                            ) : <span style={{ fontSize: 10, color: t3 }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {u.rol === 'superadmin' ? (
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(248,113,113,.12)', color: '#F87171', fontFamily: 'DM Mono' }}>superadmin</span>
                            ) : (
                              <select value={u.rol} onChange={e => cambiarRol(u.id, e.target.value)} style={{ padding: '3px 8px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', outline: 'none' }}>
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {u.validado && u.activo ? (
                              <span style={{ fontSize: 11, color: '#34D399', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34D399', display: 'inline-block' }} /> Activo
                              </span>
                            ) : !u.validado ? (
                              <span style={{ fontSize: 11, color: '#FBB040' }}>Pendiente</span>
                            ) : (
                              <span style={{ fontSize: 11, color: '#F87171' }}>Inactivo</span>
                            )}
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

      {/* ============ MODAL NUEVA ACTIVIDAD ============ */}
      {modalNuevaAct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 480, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Nueva actividad</div>
              <button onClick={() => setModalNuevaAct(false)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Titulo *</label>
              <input type="text" value={nuevaAct.titulo} onChange={e => setNuevaAct(p => ({ ...p, titulo: e.target.value }))} placeholder="Nombre de la actividad" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Marca / Area</label>
                <select value={nuevaAct.area_ref} onChange={e => setNuevaAct(p => ({ ...p, area_ref: e.target.value }))} style={inputStyle}>
                  {['EMC', 'SVN', 'ERG', 'VNF', 'PREMIER', 'ORNELLA', 'MENTOR'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Responsable</label>
                <select value={nuevaAct.responsable_ref} onChange={e => setNuevaAct(p => ({ ...p, responsable_ref: e.target.value }))} style={inputStyle}>
                  {Object.entries(MIEMBROS_REFS).map(([ref, nombre]) => <option key={ref} value={ref}>{nombre}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Mes</label>
                <select value={nuevaAct.mes} onChange={e => setNuevaAct(p => ({ ...p, mes: e.target.value }))} style={inputStyle}>
                  {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Horas</label>
                <input type="number" value={nuevaAct.horas} onChange={e => setNuevaAct(p => ({ ...p, horas: e.target.value }))} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Dias prod.</label>
                <input type="number" value={nuevaAct.dias_produccion} onChange={e => setNuevaAct(p => ({ ...p, dias_produccion: e.target.value }))} placeholder="0" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Estado inicial</label>
                <select value={nuevaAct.estado} onChange={e => setNuevaAct(p => ({ ...p, estado: e.target.value }))} style={inputStyle}>
                  {COLUMNAS_KANBAN.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Fecha entrega</label>
                <input type="date" value={nuevaAct.fecha_entrega} onChange={e => setNuevaAct(p => ({ ...p, fecha_entrega: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalNuevaAct(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={crearActividad} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Crear actividad</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL EDITAR USUARIO ============ */}
      {modalEditar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Editar usuario</div>
              <button onClick={() => setModalEditar(null)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Nombre</label>
                <input type="text" value={modalEditar.nombre} onChange={e => setModalEditar((p: any) => ({ ...p, nombre: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Apellido</label>
                <input type="text" value={modalEditar.apellido} onChange={e => setModalEditar((p: any) => ({ ...p, apellido: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Email (solo lectura)</label>
              <input type="email" value={modalEditar.email} disabled style={{ ...inputStyle, opacity: .5 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Rol</label>
                <select value={modalEditar.rol} onChange={e => setModalEditar((p: any) => ({ ...p, rol: e.target.value }))} style={inputStyle}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Tipo jornada</label>
                <select value={modalEditar.tipo} onChange={e => setModalEditar((p: any) => ({ ...p, tipo: e.target.value }))} style={inputStyle}>
                  <option value="A">Tipo A — Staff</option>
                  <option value="B">Tipo B — Pasante</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Empresa</label>
              <select value={modalEditar.empresa} onChange={e => setModalEditar((p: any) => ({ ...p, empresa: e.target.value }))} style={inputStyle}>
                {EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Ubicacion</label>
              <input type="text" value={modalEditar.ubicacion} onChange={e => setModalEditar((p: any) => ({ ...p, ubicacion: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 8 }}>Color de avatar</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORES_AVATAR.map(c => (
                  <div key={c} onClick={() => setModalEditar((p: any) => ({ ...p, color: c }))}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', border: modalEditar.color === c ? '3px solid white' : '2px solid transparent', boxSizing: 'border-box' }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalEditar(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarEdicion} disabled={guardandoAdmin} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: guardandoAdmin ? .7 : 1 }}>
                {guardandoAdmin ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL CREAR USUARIO ============ */}
      {modalCrear && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Crear usuario</div>
              <button onClick={() => setModalCrear(false)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Nombre *</label>
                <input type="text" value={nuevoUsr.nombre} onChange={e => setNuevoUsr(p => ({ ...p, nombre: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Apellido *</label>
                <input type="text" value={nuevoUsr.apellido} onChange={e => setNuevoUsr(p => ({ ...p, apellido: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Email *</label>
              <input type="email" value={nuevoUsr.email} onChange={e => setNuevoUsr(p => ({ ...p, email: e.target.value }))} placeholder="usuario@eminat.net" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Contrasena temporal *</label>
              <input type="password" value={nuevoUsr.password} onChange={e => setNuevoUsr(p => ({ ...p, password: e.target.value }))} placeholder="Min. 8 caracteres" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Rol</label>
                <select value={nuevoUsr.rol} onChange={e => setNuevoUsr(p => ({ ...p, rol: e.target.value }))} style={inputStyle}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Tipo</label>
                <select value={nuevoUsr.tipo} onChange={e => setNuevoUsr(p => ({ ...p, tipo: e.target.value }))} style={inputStyle}>
                  <option value="A">Tipo A — Staff</option>
                  <option value="B">Tipo B — Pasante</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Empresa</label>
              <select value={nuevoUsr.empresa} onChange={e => setNuevoUsr(p => ({ ...p, empresa: e.target.value }))} style={inputStyle}>
                {EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 8 }}>Color de avatar</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORES_AVATAR.map(c => (
                  <div key={c} onClick={() => setNuevoUsr(p => ({ ...p, color: c }))}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', border: nuevoUsr.color === c ? '3px solid white' : '2px solid transparent', boxSizing: 'border-box' }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalCrear(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={crearUsuario} disabled={guardandoAdmin} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: '#F87171', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: guardandoAdmin ? .7 : 1 }}>
                {guardandoAdmin ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL ELIMINAR ============ */}
      {modalEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: t1, marginBottom: 8 }}>Eliminar usuario</div>
            <div style={{ fontSize: 13, color: t2, marginBottom: 24, lineHeight: 1.5 }}>Esta accion es permanente y no se puede deshacer.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalEliminar(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => eliminarUsuario(modalEliminar)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#F87171', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
