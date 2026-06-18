'use client'
import { useState, useEffect, useMemo } from 'react'
import { useApp } from '@/lib/AppContext'
import AppShell from '@/app/components/AppShell'
import { supabase } from '@/lib/supabase'
import { PageTransition, StaggerGrid, StaggerItem, AnimatedNumber, ModalOverlay, FadeInSection } from '@/shared/motion'

// ── Types ─────────────────────────────────────────────────────────────
interface Paciente {
  id: string
  mrn: string
  nombre: string
  apellido: string
  fecha_nacimiento: string
  genero: string
  telefono: string
  email: string
  seguro: string
  seguro_id: string
  direccion: string
  estado: 'activo' | 'inactivo' | 'alta'
  alergias: string
  condiciones: string
  notas: string
  created_at: string
  updated_at: string
}

interface Cita {
  id: string
  paciente_id: string
  paciente_nombre: string
  tipo: string
  fecha: string
  hora: string
  duracion: number
  doctor: string
  estado: 'programada' | 'confirmada' | 'en_curso' | 'completada' | 'cancelada' | 'no_show'
  notas: string
  sala: string
  created_at: string
}

interface HipaaLog {
  id: string
  usuario_email: string
  usuario_nombre: string
  accion: string
  recurso: string
  paciente_id: string
  paciente_nombre: string
  detalles: string
  ip: string
  timestamp: string
  nivel: 'info' | 'warning' | 'critical'
}

interface HipaaIncidente {
  id: string
  titulo: string
  descripcion: string
  tipo: 'breach' | 'violation' | 'near_miss' | 'complaint'
  severidad: 'baja' | 'media' | 'alta' | 'critica'
  estado: 'abierto' | 'investigando' | 'resuelto' | 'cerrado'
  reportado_por: string
  fecha_incidente: string
  fecha_resolucion: string | null
  acciones_correctivas: string
  created_at: string
}

interface HipaaTraining {
  id: string
  usuario_email: string
  usuario_nombre: string
  curso: string
  fecha_completado: string | null
  fecha_vencimiento: string
  estado: 'pendiente' | 'completado' | 'vencido'
  puntuacion: number | null
}

// ── Constants ─────────────────────────────────────────────────────────
const TIPOS_CITA = ['Consulta General', 'Seguimiento', 'Especialidad', 'Laboratorio', 'Imagen', 'Procedimiento', 'Urgencia', 'Telemedicina']
const DOCTORES = ['Dr. Javier Andrade', 'Dra. Dayrelis Mesa-Sardina', 'Dr. Leonardo Salazar', 'Dra. Diana Hernandez']
const SALAS = ['Sala 1', 'Sala 2', 'Sala 3', 'Consultorio A', 'Consultorio B', 'Telemedicina']
const GENEROS = ['Masculino', 'Femenino', 'No binario', 'Prefiere no decir']
const SEGUROS = ['Medicare', 'Medicaid', 'Blue Cross', 'Aetna', 'UnitedHealth', 'Cigna', 'Humana', 'Privado', 'Sin seguro']

const ESTADO_CITA_COLORS: Record<string, string> = {
  programada: '#60A5FA',
  confirmada: '#34D399',
  en_curso: '#7C6FF7',
  completada: '#34D399',
  cancelada: '#F87171',
  no_show: '#FBB040',
}

const SEVERIDAD_COLORS: Record<string, string> = {
  baja: '#34D399',
  media: '#FBB040',
  alta: '#FB923C',
  critica: '#F87171',
}

const NIVEL_LOG_COLORS: Record<string, string> = {
  info: '#60A5FA',
  warning: '#FBB040',
  critical: '#F87171',
}

// ── Demo Data ─────────────────────────────────────────────────────────
function generateDemoData() {
  const pacientes: Paciente[] = [
    { id: 'p1', mrn: 'MRN-2024-0001', nombre: 'Maria', apellido: 'Rodriguez', fecha_nacimiento: '1985-03-15', genero: 'Femenino', telefono: '(305) 555-0101', email: 'maria.r@email.com', seguro: 'Blue Cross', seguro_id: 'BC-8834521', direccion: '1234 NW 7th St, Miami, FL 33125', estado: 'activo', alergias: 'Penicilina', condiciones: 'Hipertension, Diabetes Tipo 2', notas: '', created_at: '2024-01-10', updated_at: '2024-03-20' },
    { id: 'p2', mrn: 'MRN-2024-0002', nombre: 'Carlos', apellido: 'Mendez', fecha_nacimiento: '1972-08-22', genero: 'Masculino', telefono: '(305) 555-0102', email: 'carlos.m@email.com', seguro: 'Medicare', seguro_id: 'MC-7721934', direccion: '567 SW 8th Ave, Miami, FL 33130', estado: 'activo', alergias: 'Ninguna', condiciones: 'Artritis reumatoide', notas: 'Paciente de investigacion ERG-042', created_at: '2024-01-15', updated_at: '2024-04-01' },
    { id: 'p3', mrn: 'MRN-2024-0003', nombre: 'Ana', apellido: 'Torres', fecha_nacimiento: '1990-11-03', genero: 'Femenino', telefono: '(786) 555-0201', email: 'ana.t@email.com', seguro: 'Aetna', seguro_id: 'AE-5543219', direccion: '890 Brickell Ave, Miami, FL 33131', estado: 'activo', alergias: 'Sulfonamidas, Latex', condiciones: 'Asma', notas: '', created_at: '2024-02-01', updated_at: '2024-03-15' },
    { id: 'p4', mrn: 'MRN-2024-0004', nombre: 'Roberto', apellido: 'Vargas', fecha_nacimiento: '1965-05-28', genero: 'Masculino', telefono: '(305) 555-0303', email: 'roberto.v@email.com', seguro: 'UnitedHealth', seguro_id: 'UH-3321876', direccion: '2345 Collins Ave, Miami Beach, FL 33140', estado: 'activo', alergias: 'Aspirina', condiciones: 'EPOC, Hipertension', notas: 'Requiere interprete', created_at: '2024-02-10', updated_at: '2024-04-05' },
    { id: 'p5', mrn: 'MRN-2024-0005', nombre: 'Isabella', apellido: 'Fernandez', fecha_nacimiento: '1998-01-14', genero: 'Femenino', telefono: '(786) 555-0404', email: 'isabella.f@email.com', seguro: 'Cigna', seguro_id: 'CG-9912345', direccion: '678 Coral Way, Miami, FL 33145', estado: 'activo', alergias: 'Ninguna', condiciones: 'Ninguna', notas: 'Paciente nueva — primer consulta', created_at: '2024-03-01', updated_at: '2024-03-01' },
    { id: 'p6', mrn: 'MRN-2024-0006', nombre: 'Pedro', apellido: 'Gutierrez', fecha_nacimiento: '1955-12-08', genero: 'Masculino', telefono: '(305) 555-0505', email: 'pedro.g@email.com', seguro: 'Medicare', seguro_id: 'MC-1187654', direccion: '1111 SW 1st St, Miami, FL 33130', estado: 'alta', alergias: 'Codeine', condiciones: 'Insuficiencia cardiaca, Fibrilacion auricular', notas: 'Alta medica 2024-03-15', created_at: '2023-11-20', updated_at: '2024-03-15' },
    { id: 'p7', mrn: 'MRN-2024-0007', nombre: 'Lucia', apellido: 'Morales', fecha_nacimiento: '1988-07-19', genero: 'Femenino', telefono: '(786) 555-0606', email: 'lucia.m@email.com', seguro: 'Humana', seguro_id: 'HU-4456789', direccion: '3456 NE 2nd Ave, Miami, FL 33137', estado: 'activo', alergias: 'Ibuprofeno', condiciones: 'Migranas cronicas', notas: '', created_at: '2024-01-25', updated_at: '2024-04-08' },
    { id: 'p8', mrn: 'MRN-2024-0008', nombre: 'Fernando', apellido: 'Castillo', fecha_nacimiento: '1978-04-02', genero: 'Masculino', telefono: '(305) 555-0707', email: 'fernando.c@email.com', seguro: 'Privado', seguro_id: 'PV-0098765', direccion: '5678 SW 72nd St, Miami, FL 33143', estado: 'activo', alergias: 'Ninguna', condiciones: 'Hipotiroidismo', notas: 'Paciente de investigacion ERG-038', created_at: '2024-02-20', updated_at: '2024-04-02' },
  ]

  const hoy = new Date()
  const citas: Cita[] = [
    { id: 'c1', paciente_id: 'p1', paciente_nombre: 'Maria Rodriguez', tipo: 'Seguimiento', fecha: formatDate(hoy), hora: '09:00', duracion: 30, doctor: 'Dr. Javier Andrade', estado: 'confirmada', notas: 'Control de presion', sala: 'Consultorio A', created_at: '2024-04-01' },
    { id: 'c2', paciente_id: 'p2', paciente_nombre: 'Carlos Mendez', tipo: 'Consulta General', fecha: formatDate(hoy), hora: '09:30', duracion: 45, doctor: 'Dra. Dayrelis Mesa-Sardina', estado: 'programada', notas: 'Revision de artritis', sala: 'Sala 1', created_at: '2024-04-02' },
    { id: 'c3', paciente_id: 'p3', paciente_nombre: 'Ana Torres', tipo: 'Laboratorio', fecha: formatDate(hoy), hora: '10:00', duracion: 15, doctor: 'Dr. Leonardo Salazar', estado: 'en_curso', notas: 'Panel metabolico completo', sala: 'Sala 2', created_at: '2024-04-03' },
    { id: 'c4', paciente_id: 'p7', paciente_nombre: 'Lucia Morales', tipo: 'Especialidad', fecha: formatDate(hoy), hora: '10:30', duracion: 60, doctor: 'Dra. Diana Hernandez', estado: 'programada', notas: 'Evaluacion neurologia', sala: 'Consultorio B', created_at: '2024-04-04' },
    { id: 'c5', paciente_id: 'p4', paciente_nombre: 'Roberto Vargas', tipo: 'Telemedicina', fecha: formatDate(hoy), hora: '11:00', duracion: 30, doctor: 'Dr. Javier Andrade', estado: 'programada', notas: 'Seguimiento EPOC', sala: 'Telemedicina', created_at: '2024-04-04' },
    { id: 'c6', paciente_id: 'p5', paciente_nombre: 'Isabella Fernandez', tipo: 'Consulta General', fecha: formatDate(addDays(hoy, 1)), hora: '09:00', duracion: 45, doctor: 'Dra. Dayrelis Mesa-Sardina', estado: 'programada', notas: 'Primera consulta', sala: 'Consultorio A', created_at: '2024-04-05' },
    { id: 'c7', paciente_id: 'p8', paciente_nombre: 'Fernando Castillo', tipo: 'Seguimiento', fecha: formatDate(addDays(hoy, 1)), hora: '10:00', duracion: 30, doctor: 'Dr. Leonardo Salazar', estado: 'programada', notas: 'Control tiroides', sala: 'Sala 1', created_at: '2024-04-05' },
    { id: 'c8', paciente_id: 'p1', paciente_nombre: 'Maria Rodriguez', tipo: 'Laboratorio', fecha: formatDate(addDays(hoy, 2)), hora: '08:30', duracion: 15, doctor: 'Dr. Javier Andrade', estado: 'programada', notas: 'HbA1c', sala: 'Sala 2', created_at: '2024-04-05' },
    { id: 'c9', paciente_id: 'p2', paciente_nombre: 'Carlos Mendez', tipo: 'Procedimiento', fecha: formatDate(addDays(hoy, -1)), hora: '14:00', duracion: 60, doctor: 'Dra. Diana Hernandez', estado: 'completada', notas: 'Infiltracion articular', sala: 'Sala 3', created_at: '2024-04-01' },
    { id: 'c10', paciente_id: 'p4', paciente_nombre: 'Roberto Vargas', tipo: 'Consulta General', fecha: formatDate(addDays(hoy, -2)), hora: '11:00', duracion: 30, doctor: 'Dr. Javier Andrade', estado: 'no_show', notas: '', sala: 'Consultorio A', created_at: '2024-03-30' },
  ]

  const auditLogs: HipaaLog[] = [
    { id: 'l1', usuario_email: 'daniel@eminat.net', usuario_nombre: 'Daniel Valderrama', accion: 'VIEW_PHI', recurso: 'medical_records', paciente_id: 'p1', paciente_nombre: 'Maria Rodriguez', detalles: 'Acceso a historial medico completo', ip: '192.168.1.45', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), nivel: 'info' },
    { id: 'l2', usuario_email: 'dmsardina@eminat.net', usuario_nombre: 'Dayrelis Mesa-Sardina', accion: 'EDIT_PHI', recurso: 'patient_demographics', paciente_id: 'p2', paciente_nombre: 'Carlos Mendez', detalles: 'Actualizacion de informacion de seguro', ip: '192.168.1.32', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), nivel: 'info' },
    { id: 'l3', usuario_email: 'daniel@eminat.net', usuario_nombre: 'Daniel Valderrama', accion: 'EXPORT_PHI', recurso: 'lab_results', paciente_id: 'p3', paciente_nombre: 'Ana Torres', detalles: 'Exportacion de resultados de laboratorio para referencia', ip: '192.168.1.45', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), nivel: 'warning' },
    { id: 'l4', usuario_email: 'freddy@eminat.net', usuario_nombre: 'Freddy Crespin', accion: 'VIEW_PHI', recurso: 'appointment_schedule', paciente_id: '', paciente_nombre: '', detalles: 'Acceso al calendario de citas — modulo Medical', ip: '192.168.1.88', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), nivel: 'info' },
    { id: 'l5', usuario_email: 'daniel@eminat.net', usuario_nombre: 'Daniel Valderrama', accion: 'CREATE_RECORD', recurso: 'patient_registration', paciente_id: 'p8', paciente_nombre: 'Fernando Castillo', detalles: 'Registro de nuevo paciente', ip: '192.168.1.45', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), nivel: 'info' },
    { id: 'l6', usuario_email: 'dmsardina@eminat.net', usuario_nombre: 'Dayrelis Mesa-Sardina', accion: 'PRINT_PHI', recurso: 'prescription', paciente_id: 'p4', paciente_nombre: 'Roberto Vargas', detalles: 'Impresion de receta medica', ip: '192.168.1.32', timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), nivel: 'warning' },
    { id: 'l7', usuario_email: 'lsalazar@eminat.net', usuario_nombre: 'Leonardo Salazar', accion: 'VIEW_PHI', recurso: 'medical_records', paciente_id: 'p7', paciente_nombre: 'Lucia Morales', detalles: 'Revision de historial para cita', ip: '192.168.1.55', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), nivel: 'info' },
    { id: 'l8', usuario_email: 'diana@eminat.net', usuario_nombre: 'Diana Hernandez', accion: 'FAILED_ACCESS', recurso: 'medical_records', paciente_id: 'p6', paciente_nombre: 'Pedro Gutierrez', detalles: 'Intento de acceso sin autorizacion — paciente dado de alta', ip: '192.168.1.60', timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), nivel: 'critical' },
  ]

  const incidentes: HipaaIncidente[] = [
    { id: 'i1', titulo: 'PHI expuesto en impresora compartida', descripcion: 'Documentos con informacion de paciente dejados en impresora del area comun durante 15 minutos.', tipo: 'near_miss', severidad: 'media', estado: 'resuelto', reportado_por: 'Daniel Valderrama', fecha_incidente: '2024-03-28', fecha_resolucion: '2024-03-28', acciones_correctivas: 'Protocolo de impresion segura implementado. Impresora reasignada a area restringida.', created_at: '2024-03-28' },
    { id: 'i2', titulo: 'Email con PHI enviado sin cifrar', descripcion: 'Resultados de laboratorio enviados a paciente via email regular sin cifrado.', tipo: 'violation', severidad: 'alta', estado: 'investigando', reportado_por: 'Dayrelis Mesa-Sardina', fecha_incidente: '2024-04-02', fecha_resolucion: null, acciones_correctivas: 'En proceso — evaluando implementacion de portal seguro de pacientes.', created_at: '2024-04-02' },
    { id: 'i3', titulo: 'Acceso no autorizado a expediente', descripcion: 'Empleado accedio a expediente de familiar sin justificacion clinica.', tipo: 'breach', severidad: 'alta', estado: 'abierto', reportado_por: 'Daniel Valderrama', fecha_incidente: '2024-04-07', fecha_resolucion: null, acciones_correctivas: '', created_at: '2024-04-07' },
  ]

  const trainings: HipaaTraining[] = [
    { id: 't1', usuario_email: 'daniel@eminat.net', usuario_nombre: 'Daniel Valderrama', curso: 'HIPAA Privacy Rule Fundamentals', fecha_completado: '2024-01-15', fecha_vencimiento: '2025-01-15', estado: 'completado', puntuacion: 96 },
    { id: 't2', usuario_email: 'dmsardina@eminat.net', usuario_nombre: 'Dayrelis Mesa-Sardina', curso: 'HIPAA Privacy Rule Fundamentals', fecha_completado: '2024-01-18', fecha_vencimiento: '2025-01-18', estado: 'completado', puntuacion: 100 },
    { id: 't3', usuario_email: 'lsalazar@eminat.net', usuario_nombre: 'Leonardo Salazar', curso: 'HIPAA Privacy Rule Fundamentals', fecha_completado: '2024-02-01', fecha_vencimiento: '2025-02-01', estado: 'completado', puntuacion: 92 },
    { id: 't4', usuario_email: 'diana@eminat.net', usuario_nombre: 'Diana Hernandez', curso: 'HIPAA Privacy Rule Fundamentals', fecha_completado: '2024-02-05', fecha_vencimiento: '2025-02-05', estado: 'completado', puntuacion: 88 },
    { id: 't5', usuario_email: 'daniel@eminat.net', usuario_nombre: 'Daniel Valderrama', curso: 'HIPAA Security Rule & Cybersecurity', fecha_completado: '2024-03-10', fecha_vencimiento: '2025-03-10', estado: 'completado', puntuacion: 94 },
    { id: 't6', usuario_email: 'dmsardina@eminat.net', usuario_nombre: 'Dayrelis Mesa-Sardina', curso: 'HIPAA Security Rule & Cybersecurity', fecha_completado: null, fecha_vencimiento: '2024-04-30', estado: 'pendiente', puntuacion: null },
    { id: 't7', usuario_email: 'lsalazar@eminat.net', usuario_nombre: 'Leonardo Salazar', curso: 'HIPAA Security Rule & Cybersecurity', fecha_completado: null, fecha_vencimiento: '2024-03-15', estado: 'vencido', puntuacion: null },
    { id: 't8', usuario_email: 'diana@eminat.net', usuario_nombre: 'Diana Hernandez', curso: 'Breach Notification Procedures', fecha_completado: null, fecha_vencimiento: '2024-05-15', estado: 'pendiente', puntuacion: null },
    { id: 't9', usuario_email: 'freddy@eminat.net', usuario_nombre: 'Freddy Crespin', curso: 'HIPAA for Marketing Teams', fecha_completado: '2024-02-20', fecha_vencimiento: '2025-02-20', estado: 'completado', puntuacion: 90 },
  ]

  return { pacientes, citas, auditLogs, incidentes, trainings }
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}
function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
function calcAge(dob: string) {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// ── Component ─────────────────────────────────────────────────────────
export default function MedicalPage() {
  const { usuario, s1, s2, s3, border, t1, t2, t3, accent, inputStyle, mostrarMensaje, canMedical, esSuperAdmin, dark } = useApp()

  const [tab, setTab] = useState('dashboard')
  const [demo] = useState(() => generateDemoData())
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [auditLogs, setAuditLogs] = useState<HipaaLog[]>([])
  const [incidentes, setIncidentes] = useState<HipaaIncidente[]>([])
  const [trainings, setTrainings] = useState<HipaaTraining[]>([])

  // Filters
  const [searchPaciente, setSearchPaciente] = useState('')
  const [filterEstadoPaciente, setFilterEstadoPaciente] = useState('todos')
  const [filterCitaFecha, setFilterCitaFecha] = useState('hoy')
  const [searchAudit, setSearchAudit] = useState('')
  const [filterAuditNivel, setFilterAuditNivel] = useState('todos')

  // Modals
  const [modalPaciente, setModalPaciente] = useState(false)
  const [modalCita, setModalCita] = useState(false)
  const [modalIncidente, setModalIncidente] = useState(false)
  const [detallePaciente, setDetallePaciente] = useState<Paciente | null>(null)

  // Form state
  const [formPaciente, setFormPaciente] = useState<Partial<Paciente>>({})
  const [formCita, setFormCita] = useState<Partial<Cita>>({})
  const [formIncidente, setFormIncidente] = useState<Partial<HipaaIncidente>>({})

  useEffect(() => {
    setPacientes(demo.pacientes)
    setCitas(demo.citas)
    setAuditLogs(demo.auditLogs)
    setIncidentes(demo.incidentes)
    setTrainings(demo.trainings)
  }, [demo])

  // ── Permission gate ───────────────────────────────────────────────
  if (!canMedical) {
    return (
      <AppShell>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16 }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>Access denied</div>
          <div style={{ fontSize: 13, color: t3 }}>You don't have access to the Medical HIPAA module</div>
        </div>
      </AppShell>
    )
  }

  // ── Computed ───────────────────────────────────────────────────────
  const hoy = formatDate(new Date())
  const citasHoy = citas.filter(c => c.fecha === hoy)
  const citasManana = citas.filter(c => c.fecha === formatDate(addDays(new Date(), 1)))
  const pacientesActivos = pacientes.filter(p => p.estado === 'activo')
  const incidentesAbiertos = incidentes.filter(i => i.estado === 'abierto' || i.estado === 'investigando')
  const trainingsPendientes = trainings.filter(t => t.estado === 'pendiente' || t.estado === 'vencido')
  const complianceScore = Math.round(((trainings.filter(t => t.estado === 'completado').length / Math.max(trainings.length, 1)) * 70) + ((incidentes.filter(i => i.estado === 'resuelto' || i.estado === 'cerrado').length / Math.max(incidentes.length, 1)) * 30))

  const filteredPacientes = useMemo(() => {
    return pacientes.filter(p => {
      const matchSearch = !searchPaciente || `${p.nombre} ${p.apellido} ${p.mrn}`.toLowerCase().includes(searchPaciente.toLowerCase())
      const matchEstado = filterEstadoPaciente === 'todos' || p.estado === filterEstadoPaciente
      return matchSearch && matchEstado
    })
  }, [pacientes, searchPaciente, filterEstadoPaciente])

  const filteredCitas = useMemo(() => {
    if (filterCitaFecha === 'hoy') return citas.filter(c => c.fecha === hoy)
    if (filterCitaFecha === 'manana') return citas.filter(c => c.fecha === formatDate(addDays(new Date(), 1)))
    if (filterCitaFecha === 'semana') {
      const fin = formatDate(addDays(new Date(), 7))
      return citas.filter(c => c.fecha >= hoy && c.fecha <= fin)
    }
    return citas
  }, [citas, filterCitaFecha, hoy])

  const filteredAudit = useMemo(() => {
    return auditLogs.filter(l => {
      const matchSearch = !searchAudit || `${l.usuario_nombre} ${l.accion} ${l.paciente_nombre} ${l.detalles}`.toLowerCase().includes(searchAudit.toLowerCase())
      const matchNivel = filterAuditNivel === 'todos' || l.nivel === filterAuditNivel
      return matchSearch && matchNivel
    })
  }, [auditLogs, searchAudit, filterAuditNivel])

  // ── Handlers ──────────────────────────────────────────────────────
  function handleAddPaciente() {
    if (!formPaciente.nombre || !formPaciente.apellido) {
      mostrarMensaje('error', 'Nombre y apellido son requeridos')
      return
    }
    const newP: Paciente = {
      id: `p${Date.now()}`,
      mrn: `MRN-2024-${String(pacientes.length + 1).padStart(4, '0')}`,
      nombre: formPaciente.nombre || '',
      apellido: formPaciente.apellido || '',
      fecha_nacimiento: formPaciente.fecha_nacimiento || '',
      genero: formPaciente.genero || '',
      telefono: formPaciente.telefono || '',
      email: formPaciente.email || '',
      seguro: formPaciente.seguro || '',
      seguro_id: formPaciente.seguro_id || '',
      direccion: formPaciente.direccion || '',
      estado: 'activo',
      alergias: formPaciente.alergias || '',
      condiciones: formPaciente.condiciones || '',
      notas: formPaciente.notas || '',
      created_at: hoy,
      updated_at: hoy,
    }
    setPacientes(prev => [newP, ...prev])
    logAction('CREATE_RECORD', 'patient_registration', newP.id, `${newP.nombre} ${newP.apellido}`, `Registro de nuevo paciente — ${newP.mrn}`)
    setModalPaciente(false)
    setFormPaciente({})
    mostrarMensaje('ok', `Paciente ${newP.nombre} ${newP.apellido} registrado`)
  }

  function handleAddCita() {
    if (!formCita.paciente_id || !formCita.fecha || !formCita.hora) {
      mostrarMensaje('error', 'Paciente, fecha y hora son requeridos')
      return
    }
    const pac = pacientes.find(p => p.id === formCita.paciente_id)
    const newC: Cita = {
      id: `c${Date.now()}`,
      paciente_id: formCita.paciente_id || '',
      paciente_nombre: pac ? `${pac.nombre} ${pac.apellido}` : '',
      tipo: formCita.tipo || 'Consulta General',
      fecha: formCita.fecha || '',
      hora: formCita.hora || '',
      duracion: formCita.duracion || 30,
      doctor: formCita.doctor || DOCTORES[0],
      estado: 'programada',
      notas: formCita.notas || '',
      sala: formCita.sala || SALAS[0],
      created_at: hoy,
    }
    setCitas(prev => [newC, ...prev].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora)))
    setModalCita(false)
    setFormCita({})
    mostrarMensaje('ok', 'Cita programada exitosamente')
  }

  function handleAddIncidente() {
    if (!formIncidente.titulo) {
      mostrarMensaje('error', 'Titulo del incidente es requerido')
      return
    }
    const newI: HipaaIncidente = {
      id: `i${Date.now()}`,
      titulo: formIncidente.titulo || '',
      descripcion: formIncidente.descripcion || '',
      tipo: (formIncidente.tipo as any) || 'near_miss',
      severidad: (formIncidente.severidad as any) || 'media',
      estado: 'abierto',
      reportado_por: `${usuario?.nombre} ${usuario?.apellido}`,
      fecha_incidente: formIncidente.fecha_incidente || hoy,
      fecha_resolucion: null,
      acciones_correctivas: '',
      created_at: hoy,
    }
    setIncidentes(prev => [newI, ...prev])
    logAction('CREATE_RECORD', 'hipaa_incident', '', '', `Incidente HIPAA reportado: ${newI.titulo}`, 'warning')
    setModalIncidente(false)
    setFormIncidente({})
    mostrarMensaje('ok', 'Incidente HIPAA registrado')
  }

  function updateCitaEstado(id: string, estado: Cita['estado']) {
    setCitas(prev => prev.map(c => c.id === id ? { ...c, estado } : c))
    mostrarMensaje('ok', `Cita actualizada a ${estado}`)
  }

  function logAction(accion: string, recurso: string, paciente_id: string, paciente_nombre: string, detalles: string, nivel: HipaaLog['nivel'] = 'info') {
    const newLog: HipaaLog = {
      id: `l${Date.now()}`,
      usuario_email: usuario?.email || '',
      usuario_nombre: `${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim(),
      accion,
      recurso,
      paciente_id,
      paciente_nombre,
      detalles,
      ip: '192.168.1.88',
      timestamp: new Date().toISOString(),
      nivel,
    }
    setAuditLogs(prev => [newLog, ...prev])
  }

  // ── Tabs ──────────────────────────────────────────────────────────
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'pacientes', label: 'Pacientes', icon: '👥' },
    { id: 'citas', label: 'Citas', icon: '📅' },
    { id: 'hipaa', label: 'HIPAA', icon: '🛡️' },
    { id: 'audit', label: 'Audit Log', icon: '📋' },
  ]

  // ── Shared styles ─────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = { background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
  const statCardStyle: React.CSSProperties = { ...cardStyle, display: 'flex', flexDirection: 'column', gap: 4 }
  const btnPrimary: React.CSSProperties = { padding: '8px 16px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans' }
  const btnSecondary: React.CSSProperties = { padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', fontWeight: 600, fontFamily: 'DM Sans' }
  const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
  const modalBox: React.CSSProperties = { background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: t2, marginBottom: 4, display: 'block' }
  const badgeStyle = (color: string): React.CSSProperties => ({ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${color}18`, color, fontWeight: 600, whiteSpace: 'nowrap' })
  const hipaaShield: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(52,211,153,0.12)', color: '#34D399', fontWeight: 600 }

  return (
    <AppShell activeTab={tab} onTabChange={setTab}>
      <PageTransition>

      {/* TAB BAR */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}`, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent', color: tab === t.id ? t1 : t3, borderBottom: tab === t.id ? `2px solid ${accent}` : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
        <div style={hipaaShield}>🛡️ HIPAA Compliant</div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* DASHBOARD TAB */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {tab === 'dashboard' && (
        <div>
          {/* KPI Cards */}
          <StaggerGrid style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            <StaggerItem style={statCardStyle}>
              <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Active Patients</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Syne', color: '#34D399' }}><AnimatedNumber value={pacientesActivos.length} /></div>
              <div style={{ fontSize: 10, color: t3 }}>{pacientes.length} total</div>
            </StaggerItem>
            <StaggerItem style={statCardStyle}>
              <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Appointments Today</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Syne', color: '#60A5FA' }}><AnimatedNumber value={citasHoy.length} /></div>
              <div style={{ fontSize: 10, color: t3 }}>{citasManana.length} tomorrow</div>
            </StaggerItem>
            <StaggerItem style={statCardStyle}>
              <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Compliance Score</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Syne', color: complianceScore >= 80 ? '#34D399' : complianceScore >= 60 ? '#FBB040' : '#F87171' }}><AnimatedNumber value={complianceScore} suffix="%" /></div>
              <div style={{ fontSize: 10, color: t3 }}>HIPAA compliance</div>
            </StaggerItem>
            <StaggerItem style={statCardStyle}>
              <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Open Incidents</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Syne', color: incidentesAbiertos.length > 0 ? '#F87171' : '#34D399' }}><AnimatedNumber value={incidentesAbiertos.length} /></div>
              <div style={{ fontSize: 10, color: t3 }}>{incidentes.length} total</div>
            </StaggerItem>
          </StaggerGrid>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Citas de Hoy */}
            <div style={cardStyle}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                📅 Today's Appointments
                <span style={badgeStyle(accent)}>{citasHoy.length}</span>
              </div>
              {citasHoy.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: t3, fontSize: 12 }}>No appointments today</div>
              ) : citasHoy.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${border}` }}>
                  <div style={{ width: 42, textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t1 }}>{c.hora}</div>
                    <div style={{ fontSize: 9, color: t3 }}>{c.duracion}min</div>
                  </div>
                  <div style={{ width: 3, height: 32, borderRadius: 2, background: ESTADO_CITA_COLORS[c.estado] || accent }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>{c.paciente_nombre}</div>
                    <div style={{ fontSize: 10, color: t2 }}>{c.tipo} · {c.doctor}</div>
                  </div>
                  <span style={badgeStyle(ESTADO_CITA_COLORS[c.estado] || accent)}>{c.estado}</span>
                </div>
              ))}
            </div>

            {/* HIPAA Alerts */}
            <div style={cardStyle}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                🛡️ HIPAA Alerts
                {(incidentesAbiertos.length > 0 || trainingsPendientes.length > 0) && <span style={badgeStyle('#F87171')}>{incidentesAbiertos.length + trainingsPendientes.length} pending</span>}
              </div>

              {incidentesAbiertos.map(i => (
                <div key={i.id} style={{ padding: '10px 12px', borderRadius: 10, background: `${SEVERIDAD_COLORS[i.severidad]}08`, border: `1px solid ${SEVERIDAD_COLORS[i.severidad]}25`, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={badgeStyle(SEVERIDAD_COLORS[i.severidad])}>{i.severidad}</span>
                    <span style={badgeStyle(accent)}>{i.tipo}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>{i.titulo}</div>
                  <div style={{ fontSize: 10, color: t3, marginTop: 2 }}>{i.fecha_incidente} · Reported by {i.reportado_por}</div>
                </div>
              ))}

              {trainingsPendientes.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: t2, marginBottom: 8 }}>Pending Training</div>
                  {trainingsPendientes.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${border}` }}>
                      <span style={{ fontSize: 14 }}>{t.estado === 'vencido' ? '⚠️' : '📚'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: t1 }}>{t.usuario_nombre}</div>
                        <div style={{ fontSize: 10, color: t3 }}>{t.curso}</div>
                      </div>
                      <span style={badgeStyle(t.estado === 'vencido' ? '#F87171' : '#FBB040')}>{t.estado}</span>
                    </div>
                  ))}
                </div>
              )}

              {incidentesAbiertos.length === 0 && trainingsPendientes.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 12, color: '#34D399', fontWeight: 600 }}>All Clear — No HIPAA alerts</div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Audit Activity */}
          <div style={{ ...cardStyle, marginTop: 16 }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              📋 Recent PHI Activity
              <span style={badgeStyle(accent)}>Last 3h</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    {['Time', 'User', 'Action', 'Patient', 'Details', 'Level'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.slice(0, 5).map(l => (
                    <tr key={l.id} style={{ borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: '8px 10px', color: t2, fontFamily: 'DM Mono', fontSize: 10 }}>{new Date(l.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ padding: '8px 10px', color: t1, fontWeight: 500 }}>{l.usuario_nombre}</td>
                      <td style={{ padding: '8px 10px' }}><span style={badgeStyle(l.accion.includes('FAILED') ? '#F87171' : l.accion.includes('EXPORT') || l.accion.includes('PRINT') ? '#FBB040' : '#60A5FA')}>{l.accion}</span></td>
                      <td style={{ padding: '8px 10px', color: t2 }}>{l.paciente_nombre || '—'}</td>
                      <td style={{ padding: '8px 10px', color: t3, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.detalles}</td>
                      <td style={{ padding: '8px 10px' }}><span style={badgeStyle(NIVEL_LOG_COLORS[l.nivel])}>{l.nivel}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* PACIENTES TAB */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {tab === 'pacientes' && (
        <div>
          {/* Controls */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <input placeholder="Search patient (name, MRN)..." value={searchPaciente} onChange={e => setSearchPaciente(e.target.value)} style={{ ...inputStyle, maxWidth: 300 }} />
            <select value={filterEstadoPaciente} onChange={e => setFilterEstadoPaciente(e.target.value)} style={{ ...inputStyle, maxWidth: 160 }}>
              <option value="todos">All statuses</option>
              <option value="activo">Active</option>
              <option value="inactivo">Inactive</option>
              <option value="alta">Discharged</option>
            </select>
            <div style={{ flex: 1 }} />
            <button onClick={() => { setFormPaciente({}); setModalPaciente(true) }} style={btnPrimary}>+ New Patient</button>
          </div>

          {/* Patient Detail View */}
          {detallePaciente ? (
            <div>
              <button onClick={() => setDetallePaciente(null)} style={{ ...btnSecondary, marginBottom: 16 }}>← Back to list</button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Demographics */}
                <div style={cardStyle}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Patient Details
                    <span style={badgeStyle(detallePaciente.estado === 'activo' ? '#34D399' : detallePaciente.estado === 'alta' ? '#FBB040' : '#F87171')}>{detallePaciente.estado}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
                    {[
                      ['MRN', detallePaciente.mrn],
                      ['Name', `${detallePaciente.nombre} ${detallePaciente.apellido}`],
                      ['DOB', `${detallePaciente.fecha_nacimiento} (${calcAge(detallePaciente.fecha_nacimiento)} years)`],
                      ['Gender', detallePaciente.genero],
                      ['Phone', detallePaciente.telefono],
                      ['Email', detallePaciente.email],
                      ['Insurance', `${detallePaciente.seguro} — ${detallePaciente.seguro_id}`],
                      ['Address', detallePaciente.direccion],
                    ].map(([label, value]) => (
                      <div key={label as string}>
                        <div style={{ fontSize: 10, color: t3, marginBottom: 2 }}>{label}</div>
                        <div style={{ color: t1, fontWeight: 500 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clinical Info */}
                <div style={cardStyle}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14 }}>Clinical Info</div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Allergies</div>
                    {detallePaciente.alergias && detallePaciente.alergias !== 'Ninguna' ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {detallePaciente.alergias.split(',').map(a => (
                          <span key={a.trim()} style={badgeStyle('#F87171')}>{a.trim()}</span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#34D399' }}>No known allergies</div>
                    )}
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Conditions</div>
                    {detallePaciente.condiciones && detallePaciente.condiciones !== 'Ninguna' ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {detallePaciente.condiciones.split(',').map(c => (
                          <span key={c.trim()} style={badgeStyle('#FBB040')}>{c.trim()}</span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#34D399' }}>No conditions on record</div>
                    )}
                  </div>
                  {detallePaciente.notas && (
                    <div>
                      <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Notes</div>
                      <div style={{ fontSize: 12, color: t2, padding: '8px 10px', borderRadius: 8, background: s2 }}>{detallePaciente.notas}</div>
                    </div>
                  )}
                </div>

                {/* Patient Appointments */}
                <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14 }}>Appointment History</div>
                  {citas.filter(c => c.paciente_id === detallePaciente.id).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: t3, fontSize: 12 }}>No appointments on record</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${border}` }}>
                          {['Date', 'Time', 'Type', 'Doctor', 'Room', 'Status'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {citas.filter(c => c.paciente_id === detallePaciente.id).map(c => (
                          <tr key={c.id} style={{ borderBottom: `1px solid ${border}` }}>
                            <td style={{ padding: '8px 10px', color: t1, fontFamily: 'DM Mono', fontSize: 10 }}>{c.fecha}</td>
                            <td style={{ padding: '8px 10px', color: t1 }}>{c.hora}</td>
                            <td style={{ padding: '8px 10px', color: t2 }}>{c.tipo}</td>
                            <td style={{ padding: '8px 10px', color: t2 }}>{c.doctor}</td>
                            <td style={{ padding: '8px 10px', color: t3 }}>{c.sala}</td>
                            <td style={{ padding: '8px 10px' }}><span style={badgeStyle(ESTADO_CITA_COLORS[c.estado] || accent)}>{c.estado}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Patient List */
            <div style={cardStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    {['MRN', 'Patient', 'Age', 'Gender', 'Insurance', 'Phone', 'Status', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPacientes.map(p => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${border}`, cursor: 'pointer' }} onClick={() => { setDetallePaciente(p); logAction('VIEW_PHI', 'patient_demographics', p.id, `${p.nombre} ${p.apellido}`, `Acceso a ficha del paciente ${p.mrn}`) }}>
                      <td style={{ padding: '10px', fontFamily: 'DM Mono', fontSize: 10, color: accent }}>{p.mrn}</td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 600, color: t1 }}>{p.nombre} {p.apellido}</div>
                        {p.alergias && p.alergias !== 'Ninguna' && <div style={{ fontSize: 9, color: '#F87171' }}>⚠️ Allergies: {p.alergias}</div>}
                      </td>
                      <td style={{ padding: '10px', color: t2 }}>{calcAge(p.fecha_nacimiento)}</td>
                      <td style={{ padding: '10px', color: t2 }}>{p.genero}</td>
                      <td style={{ padding: '10px', color: t2, fontSize: 11 }}>{p.seguro}</td>
                      <td style={{ padding: '10px', color: t3, fontSize: 11 }}>{p.telefono}</td>
                      <td style={{ padding: '10px' }}><span style={badgeStyle(p.estado === 'activo' ? '#34D399' : p.estado === 'alta' ? '#FBB040' : '#F87171')}>{p.estado}</span></td>
                      <td style={{ padding: '10px' }}>
                        <button onClick={e => { e.stopPropagation(); setDetallePaciente(p) }} style={{ ...btnSecondary, fontSize: 10, padding: '4px 10px' }}>Ver</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPacientes.length === 0 && (
                <div style={{ textAlign: 'center', padding: 32, color: t3, fontSize: 12 }}>No patients found</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* CITAS TAB */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {tab === 'citas' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { id: 'hoy', label: 'Today' },
                { id: 'manana', label: 'Tomorrow' },
                { id: 'semana', label: 'Week' },
                { id: 'todas', label: 'All' },
              ].map(f => (
                <button key={f.id} onClick={() => setFilterCitaFecha(f.id)}
                  style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${filterCitaFecha === f.id ? accent : border}`, background: filterCitaFecha === f.id ? `${accent}18` : s2, color: filterCitaFecha === f.id ? accent : t2, fontFamily: 'DM Sans' }}>
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={() => { setFormCita({}); setModalCita(true) }} style={btnPrimary}>+ New Appointment</button>
          </div>

          <div style={cardStyle}>
            {filteredCitas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: t3 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                <div style={{ fontSize: 13 }}>No appointments for this period</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    {['Date', 'Time', 'Patient', 'Type', 'Doctor', 'Room', 'Duration', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCitas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora)).map(c => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: '10px', fontFamily: 'DM Mono', fontSize: 10, color: t2 }}>{c.fecha}</td>
                      <td style={{ padding: '10px', fontWeight: 600, color: t1 }}>{c.hora}</td>
                      <td style={{ padding: '10px', color: t1, fontWeight: 500 }}>{c.paciente_nombre}</td>
                      <td style={{ padding: '10px' }}><span style={badgeStyle(accent)}>{c.tipo}</span></td>
                      <td style={{ padding: '10px', color: t2, fontSize: 11 }}>{c.doctor}</td>
                      <td style={{ padding: '10px', color: t3, fontSize: 11 }}>{c.sala}</td>
                      <td style={{ padding: '10px', color: t3, fontSize: 11 }}>{c.duracion}min</td>
                      <td style={{ padding: '10px' }}><span style={badgeStyle(ESTADO_CITA_COLORS[c.estado] || accent)}>{c.estado}</span></td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {c.estado === 'programada' && (
                            <>
                              <button onClick={() => updateCitaEstado(c.id, 'confirmada')} style={{ ...btnSecondary, fontSize: 9, padding: '3px 8px', color: '#34D399', borderColor: '#34D39940' }}>Confirm</button>
                              <button onClick={() => updateCitaEstado(c.id, 'cancelada')} style={{ ...btnSecondary, fontSize: 9, padding: '3px 8px', color: '#F87171', borderColor: '#F8717140' }}>Cancel</button>
                            </>
                          )}
                          {c.estado === 'confirmada' && (
                            <button onClick={() => updateCitaEstado(c.id, 'en_curso')} style={{ ...btnSecondary, fontSize: 9, padding: '3px 8px', color: accent, borderColor: `${accent}40` }}>Start</button>
                          )}
                          {c.estado === 'en_curso' && (
                            <button onClick={() => updateCitaEstado(c.id, 'completada')} style={{ ...btnSecondary, fontSize: 9, padding: '3px 8px', color: '#34D399', borderColor: '#34D39940' }}>Complete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* HIPAA TAB */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {tab === 'hipaa' && (
        <div>
          {/* Compliance Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div style={statCardStyle}>
              <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Compliance Score</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Syne', color: complianceScore >= 80 ? '#34D399' : complianceScore >= 60 ? '#FBB040' : '#F87171' }}>{complianceScore}%</div>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: s3, marginTop: 4 }}>
                <div style={{ height: '100%', borderRadius: 2, background: complianceScore >= 80 ? '#34D399' : complianceScore >= 60 ? '#FBB040' : '#F87171', width: `${complianceScore}%`, transition: 'width .5s' }} />
              </div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Training Completed</div>
              <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Syne', color: '#34D399' }}>{trainings.filter(t => t.estado === 'completado').length}/{trainings.length}</div>
              <div style={{ fontSize: 10, color: t3 }}>{trainingsPendientes.length} pending</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Incidentes 2024</div>
              <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Syne', color: incidentesAbiertos.length > 0 ? '#FBB040' : '#34D399' }}>{incidentes.length}</div>
              <div style={{ fontSize: 10, color: t3 }}>{incidentesAbiertos.length} open · {incidentes.filter(i => i.estado === 'resuelto' || i.estado === 'cerrado').length} resolved</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Incidentes */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1 }}>HIPAA Incidents</div>
                <button onClick={() => { setFormIncidente({}); setModalIncidente(true) }} style={btnPrimary}>+ Report</button>
              </div>
              {incidentes.map(i => (
                <div key={i.id} style={{ padding: '12px', borderRadius: 10, border: `1px solid ${border}`, marginBottom: 8, background: i.estado === 'abierto' ? `${SEVERIDAD_COLORS[i.severidad]}05` : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={badgeStyle(SEVERIDAD_COLORS[i.severidad])}>{i.severidad}</span>
                    <span style={badgeStyle(accent)}>{i.tipo}</span>
                    <span style={badgeStyle(i.estado === 'abierto' ? '#F87171' : i.estado === 'investigando' ? '#FBB040' : '#34D399')}>{i.estado}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t1, marginBottom: 4 }}>{i.titulo}</div>
                  <div style={{ fontSize: 11, color: t2, lineHeight: 1.5 }}>{i.descripcion}</div>
                  <div style={{ fontSize: 10, color: t3, marginTop: 6 }}>{i.fecha_incidente} · {i.reportado_por}</div>
                  {i.acciones_correctivas && (
                    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: s2, fontSize: 11, color: t2 }}>
                      <span style={{ fontWeight: 600, color: t1 }}>Corrective actions:</span> {i.acciones_correctivas}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Training Records */}
            <div style={cardStyle}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14 }}>HIPAA Training</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    {['Staff', 'Course', 'Expiration', 'Score', 'Status'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 6px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trainings.map(t => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: '8px 6px', color: t1, fontWeight: 500 }}>{t.usuario_nombre}</td>
                      <td style={{ padding: '8px 6px', color: t2, fontSize: 10 }}>{t.curso}</td>
                      <td style={{ padding: '8px 6px', fontFamily: 'DM Mono', fontSize: 10, color: t.estado === 'vencido' ? '#F87171' : t3 }}>{t.fecha_vencimiento}</td>
                      <td style={{ padding: '8px 6px', color: t1, fontWeight: 600 }}>{t.puntuacion !== null ? `${t.puntuacion}%` : '—'}</td>
                      <td style={{ padding: '8px 6px' }}>
                        <span style={badgeStyle(t.estado === 'completado' ? '#34D399' : t.estado === 'vencido' ? '#F87171' : '#FBB040')}>{t.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* AUDIT LOG TAB */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {tab === 'audit' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
            <input placeholder="Search audit log..." value={searchAudit} onChange={e => setSearchAudit(e.target.value)} style={{ ...inputStyle, maxWidth: 300 }} />
            <select value={filterAuditNivel} onChange={e => setFilterAuditNivel(e.target.value)} style={{ ...inputStyle, maxWidth: 160 }}>
              <option value="todos">All levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
            <div style={{ flex: 1 }} />
            <div style={hipaaShield}>🔒 PHI Access Tracked</div>
          </div>

          <div style={cardStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {['Timestamp', 'User', 'Action', 'Resource', 'Patient', 'Details', 'IP', 'Level'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAudit.map(l => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${border}`, background: l.nivel === 'critical' ? 'rgba(248,113,113,0.04)' : 'transparent' }}>
                    <td style={{ padding: '10px', fontFamily: 'DM Mono', fontSize: 10, color: t2, whiteSpace: 'nowrap' }}>
                      {new Date(l.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px', color: t1, fontWeight: 500 }}>{l.usuario_nombre}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={badgeStyle(l.accion.includes('FAILED') ? '#F87171' : l.accion.includes('EXPORT') || l.accion.includes('PRINT') ? '#FBB040' : l.accion.includes('CREATE') || l.accion.includes('EDIT') ? '#34D399' : '#60A5FA')}>
                        {l.accion}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: t3, fontSize: 10 }}>{l.recurso}</td>
                    <td style={{ padding: '10px', color: t2 }}>{l.paciente_nombre || '—'}</td>
                    <td style={{ padding: '10px', color: t3, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.detalles}</td>
                    <td style={{ padding: '10px', fontFamily: 'DM Mono', fontSize: 10, color: t3 }}>{l.ip}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={badgeStyle(NIVEL_LOG_COLORS[l.nivel])}>
                        {l.nivel === 'critical' ? '🔴' : l.nivel === 'warning' ? '🟡' : '🔵'} {l.nivel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAudit.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: t3, fontSize: 12 }}>No records found</div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Nuevo Paciente */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {modalPaciente && (
        <div style={modalOverlay} onClick={() => setModalPaciente(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: t1, marginBottom: 20 }}>New Patient</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input value={formPaciente.nombre || ''} onChange={e => setFormPaciente(p => ({ ...p, nombre: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Last name *</label>
                <input value={formPaciente.apellido || ''} onChange={e => setFormPaciente(p => ({ ...p, apellido: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Date of Birth</label>
                <input type="date" value={formPaciente.fecha_nacimiento || ''} onChange={e => setFormPaciente(p => ({ ...p, fecha_nacimiento: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Gender</label>
                <select value={formPaciente.genero || ''} onChange={e => setFormPaciente(p => ({ ...p, genero: e.target.value }))} style={inputStyle}>
                  <option value="">Select...</option>
                  {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input value={formPaciente.telefono || ''} onChange={e => setFormPaciente(p => ({ ...p, telefono: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={formPaciente.email || ''} onChange={e => setFormPaciente(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Insurance</label>
                <select value={formPaciente.seguro || ''} onChange={e => setFormPaciente(p => ({ ...p, seguro: e.target.value }))} style={inputStyle}>
                  <option value="">Select...</option>
                  {SEGUROS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Insurance ID</label>
                <input value={formPaciente.seguro_id || ''} onChange={e => setFormPaciente(p => ({ ...p, seguro_id: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Address</label>
                <input value={formPaciente.direccion || ''} onChange={e => setFormPaciente(p => ({ ...p, direccion: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Allergies</label>
                <input value={formPaciente.alergias || ''} onChange={e => setFormPaciente(p => ({ ...p, alergias: e.target.value }))} placeholder="Separate with commas..." style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Conditions</label>
                <input value={formPaciente.condiciones || ''} onChange={e => setFormPaciente(p => ({ ...p, condiciones: e.target.value }))} placeholder="Separate with commas..." style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Notes</label>
                <textarea value={formPaciente.notas || ''} onChange={e => setFormPaciente(p => ({ ...p, notas: e.target.value }))} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setModalPaciente(false)} style={btnSecondary}>Cancel</button>
              <button onClick={handleAddPaciente} style={btnPrimary}>Register Patient</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Nueva Cita */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {modalCita && (
        <div style={modalOverlay} onClick={() => setModalCita(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: t1, marginBottom: 20 }}>New Appointment</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Patient *</label>
                <select value={formCita.paciente_id || ''} onChange={e => setFormCita(p => ({ ...p, paciente_id: e.target.value }))} style={inputStyle}>
                  <option value="">Select patient...</option>
                  {pacientesActivos.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido} — {p.mrn}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Date *</label>
                <input type="date" value={formCita.fecha || ''} onChange={e => setFormCita(p => ({ ...p, fecha: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Time *</label>
                <input type="time" value={formCita.hora || ''} onChange={e => setFormCita(p => ({ ...p, hora: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select value={formCita.tipo || ''} onChange={e => setFormCita(p => ({ ...p, tipo: e.target.value }))} style={inputStyle}>
                  <option value="">Select...</option>
                  {TIPOS_CITA.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Doctor</label>
                <select value={formCita.doctor || ''} onChange={e => setFormCita(p => ({ ...p, doctor: e.target.value }))} style={inputStyle}>
                  <option value="">Select...</option>
                  {DOCTORES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Room</label>
                <select value={formCita.sala || ''} onChange={e => setFormCita(p => ({ ...p, sala: e.target.value }))} style={inputStyle}>
                  {SALAS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Duration (min)</label>
                <input type="number" value={formCita.duracion || 30} onChange={e => setFormCita(p => ({ ...p, duracion: parseInt(e.target.value) }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Notes</label>
                <textarea value={formCita.notas || ''} onChange={e => setFormCita(p => ({ ...p, notas: e.target.value }))} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setModalCita(false)} style={btnSecondary}>Cancel</button>
              <button onClick={handleAddCita} style={btnPrimary}>Schedule Appointment</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Reportar Incidente HIPAA */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {modalIncidente && (
        <div style={modalOverlay} onClick={() => setModalIncidente(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: t1, marginBottom: 4 }}>Report HIPAA Incident</div>
            <div style={{ fontSize: 11, color: '#F87171', marginBottom: 20 }}>🛡️ Incidents are logged and audited</div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={labelStyle}>Incident Title *</label>
                <input value={formIncidente.titulo || ''} onChange={e => setFormIncidente(p => ({ ...p, titulo: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={formIncidente.descripcion || ''} onChange={e => setFormIncidente(p => ({ ...p, descripcion: e.target.value }))} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={formIncidente.tipo || 'near_miss'} onChange={e => setFormIncidente(p => ({ ...p, tipo: e.target.value as any }))} style={inputStyle}>
                    <option value="near_miss">Near Miss</option>
                    <option value="violation">Violation</option>
                    <option value="breach">Breach</option>
                    <option value="complaint">Complaint</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Severity</label>
                  <select value={formIncidente.severidad || 'media'} onChange={e => setFormIncidente(p => ({ ...p, severidad: e.target.value as any }))} style={inputStyle}>
                    <option value="baja">Low</option>
                    <option value="media">Medium</option>
                    <option value="alta">High</option>
                    <option value="critica">Critical</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Incident Date</label>
                  <input type="date" value={formIncidente.fecha_incidente || hoy} onChange={e => setFormIncidente(p => ({ ...p, fecha_incidente: e.target.value }))} style={inputStyle} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setModalIncidente(false)} style={btnSecondary}>Cancel</button>
              <button onClick={handleAddIncidente} style={{ ...btnPrimary, background: '#F87171' }}>Report Incident</button>
            </div>
          </div>
        </div>
      )}

      </PageTransition>
    </AppShell>
  )
}
