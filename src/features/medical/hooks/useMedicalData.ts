import { useState, useEffect, useMemo } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { generateDemoData } from '../demo-data'
import { formatDate, addDays } from '../dates'
import { DOCTORES, SALAS } from '../constants'
import type { Paciente, Cita, HipaaLog, HipaaIncidente, HipaaTraining } from '../types'

export function useMedicalData() {
  const { usuario, mostrarMensaje } = useApp()

  const [demo] = useState(() => generateDemoData())
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [auditLogs, setAuditLogs] = useState<HipaaLog[]>([])
  const [incidentes, setIncidentes] = useState<HipaaIncidente[]>([])
  const [trainings, setTrainings] = useState<HipaaTraining[]>([])

  const [searchPaciente, setSearchPaciente] = useState('')
  const [filterEstadoPaciente, setFilterEstadoPaciente] = useState('todos')
  const [filterCitaFecha, setFilterCitaFecha] = useState('hoy')
  const [searchAudit, setSearchAudit] = useState('')
  const [filterAuditNivel, setFilterAuditNivel] = useState('todos')

  useEffect(() => {
    setPacientes(demo.pacientes)
    setCitas(demo.citas)
    setAuditLogs(demo.auditLogs)
    setIncidentes(demo.incidentes)
    setTrainings(demo.trainings)
  }, [demo])

  const hoy = formatDate(new Date())
  const citasHoy = citas.filter(c => c.fecha === hoy)
  const citasManana = citas.filter(c => c.fecha === formatDate(addDays(new Date(), 1)))
  const pacientesActivos = pacientes.filter(p => p.estado === 'activo')
  const incidentesAbiertos = incidentes.filter(i => i.estado === 'abierto' || i.estado === 'investigando')
  const trainingsPendientes = trainings.filter(t => t.estado === 'pendiente' || t.estado === 'vencido')
  const complianceScore = Math.round(((trainings.filter(t => t.estado === 'completado').length / Math.max(trainings.length, 1)) * 70) + ((incidentes.filter(i => i.estado === 'resuelto' || i.estado === 'cerrado').length / Math.max(incidentes.length, 1)) * 30))

  const filteredPacientes = useMemo(() => pacientes.filter(p => {
    const matchSearch = !searchPaciente || `${p.nombre} ${p.apellido} ${p.mrn}`.toLowerCase().includes(searchPaciente.toLowerCase())
    const matchEstado = filterEstadoPaciente === 'todos' || p.estado === filterEstadoPaciente
    return matchSearch && matchEstado
  }), [pacientes, searchPaciente, filterEstadoPaciente])

  const filteredCitas = useMemo(() => {
    if (filterCitaFecha === 'hoy') return citas.filter(c => c.fecha === hoy)
    if (filterCitaFecha === 'manana') return citas.filter(c => c.fecha === formatDate(addDays(new Date(), 1)))
    if (filterCitaFecha === 'semana') {
      const fin = formatDate(addDays(new Date(), 7))
      return citas.filter(c => c.fecha >= hoy && c.fecha <= fin)
    }
    return citas
  }, [citas, filterCitaFecha, hoy])

  const filteredAudit = useMemo(() => auditLogs.filter(l => {
    const matchSearch = !searchAudit || `${l.usuario_nombre} ${l.accion} ${l.paciente_nombre} ${l.detalles}`.toLowerCase().includes(searchAudit.toLowerCase())
    const matchNivel = filterAuditNivel === 'todos' || l.nivel === filterAuditNivel
    return matchSearch && matchNivel
  }), [auditLogs, searchAudit, filterAuditNivel])

  function logAction(accion: string, recurso: string, paciente_id: string, paciente_nombre: string, detalles: string, nivel: HipaaLog['nivel'] = 'info') {
    const newLog: HipaaLog = {
      id: `l${Date.now()}`,
      usuario_email: usuario?.email || '',
      usuario_nombre: `${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim(),
      accion, recurso, paciente_id, paciente_nombre, detalles,
      ip: '192.168.1.88', timestamp: new Date().toISOString(), nivel,
    }
    setAuditLogs(prev => [newLog, ...prev])
  }

  function addPaciente(form: Partial<Paciente>): boolean {
    if (!form.nombre || !form.apellido) { mostrarMensaje('error', 'Nombre y apellido son requeridos'); return false }
    const newP: Paciente = {
      id: `p${Date.now()}`,
      mrn: `MRN-2024-${String(pacientes.length + 1).padStart(4, '0')}`,
      nombre: form.nombre || '', apellido: form.apellido || '', fecha_nacimiento: form.fecha_nacimiento || '',
      genero: form.genero || '', telefono: form.telefono || '', email: form.email || '',
      seguro: form.seguro || '', seguro_id: form.seguro_id || '', direccion: form.direccion || '',
      estado: 'activo', alergias: form.alergias || '', condiciones: form.condiciones || '', notas: form.notas || '',
      created_at: hoy, updated_at: hoy,
    }
    setPacientes(prev => [newP, ...prev])
    logAction('CREATE_RECORD', 'patient_registration', newP.id, `${newP.nombre} ${newP.apellido}`, `Registro de nuevo paciente — ${newP.mrn}`)
    mostrarMensaje('ok', `Paciente ${newP.nombre} ${newP.apellido} registrado`)
    return true
  }

  function addCita(form: Partial<Cita>): boolean {
    if (!form.paciente_id || !form.fecha || !form.hora) { mostrarMensaje('error', 'Paciente, fecha y hora son requeridos'); return false }
    const pac = pacientes.find(p => p.id === form.paciente_id)
    const newC: Cita = {
      id: `c${Date.now()}`,
      paciente_id: form.paciente_id || '', paciente_nombre: pac ? `${pac.nombre} ${pac.apellido}` : '',
      tipo: form.tipo || 'Consulta General', fecha: form.fecha || '', hora: form.hora || '',
      duracion: form.duracion || 30, doctor: form.doctor || DOCTORES[0], estado: 'programada',
      notas: form.notas || '', sala: form.sala || SALAS[0], created_at: hoy,
    }
    setCitas(prev => [newC, ...prev].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora)))
    mostrarMensaje('ok', 'Cita programada exitosamente')
    return true
  }

  function addIncidente(form: Partial<HipaaIncidente>): boolean {
    if (!form.titulo) { mostrarMensaje('error', 'Titulo del incidente es requerido'); return false }
    const newI: HipaaIncidente = {
      id: `i${Date.now()}`,
      titulo: form.titulo || '', descripcion: form.descripcion || '',
      tipo: (form.tipo as HipaaIncidente['tipo']) || 'near_miss', severidad: (form.severidad as HipaaIncidente['severidad']) || 'media',
      estado: 'abierto', reportado_por: `${usuario?.nombre} ${usuario?.apellido}`,
      fecha_incidente: form.fecha_incidente || hoy, fecha_resolucion: null, acciones_correctivas: '', created_at: hoy,
    }
    setIncidentes(prev => [newI, ...prev])
    logAction('CREATE_RECORD', 'hipaa_incident', '', '', `Incidente HIPAA reportado: ${newI.titulo}`, 'warning')
    mostrarMensaje('ok', 'Incidente HIPAA registrado')
    return true
  }

  function updateCitaEstado(id: string, estado: Cita['estado']) {
    setCitas(prev => prev.map(c => c.id === id ? { ...c, estado } : c))
    mostrarMensaje('ok', `Cita actualizada a ${estado}`)
  }

  return {
    pacientes, citas, auditLogs, incidentes, trainings,
    searchPaciente, setSearchPaciente, filterEstadoPaciente, setFilterEstadoPaciente,
    filterCitaFecha, setFilterCitaFecha, searchAudit, setSearchAudit, filterAuditNivel, setFilterAuditNivel,
    hoy, citasHoy, citasManana, pacientesActivos, incidentesAbiertos, trainingsPendientes, complianceScore,
    filteredPacientes, filteredCitas, filteredAudit,
    logAction, addPaciente, addCita, addIncidente, updateCitaEstado,
  }
}
