'use client'
import { useState, useMemo } from 'react'
import { usePacientes } from '../usePacientes'
import usePatientDashboardAggregate from '../usePatientDashboardAggregate'

const ESTADO_ACTIVO = 'activo'
const FILTRO_TODOS = 'todos'
const FILTROS_INICIALES = { search: '', estado: FILTRO_TODOS }

/** Owns the patient-registry wiring: lazy load, search/filter state, Dashboard aggregate. */
export default function usePatientManagement() {
  const {
    pacientes, pacienteFuentes, pacienteContactos, addPaciente: addPacienteDb, editPaciente, importarPacientes,
    loading: pacientesLoading, loaded: pacientesLoaded, ensureLoaded: ensurePacientesLoaded,
  } = usePacientes()
  const patientDashboard = usePatientDashboardAggregate()
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const { search: searchPaciente, estado: filterEstadoPaciente } = filtros
  const setSearchPaciente = (search: string) => setFiltros(before => ({ ...before, search }))
  const setFilterEstadoPaciente = (estado: string) => setFiltros(before => ({ ...before, estado }))
  const pacientesActivos = pacientes.filter(p => p.estado === ESTADO_ACTIVO)
  const filteredPacientes = useMemo(() => {
    const { search, estado } = filtros
    return pacientes.filter(p => {
      const matchSearch = !search || `${p.nombre} ${p.apellido} ${p.mrn}`.toLowerCase().includes(search.toLowerCase())
      const matchEstado = estado === FILTRO_TODOS || p.estado === estado
      return matchSearch && matchEstado
    })
  }, [pacientes, filtros])

  const api = {
    pacientes,
    pacienteFuentes,
    pacienteContactos,
    addPacienteDb,
    editPaciente,
    importarPacientes,
    pacientesLoading,
    pacientesLoaded,
    ensurePacientesLoaded,
    patientDashboard,
    searchPaciente,
    setSearchPaciente,
    filterEstadoPaciente,
    setFilterEstadoPaciente,
    pacientesActivos,
    filteredPacientes,
  }
  return api
}
// useMedicalData() keeps the `addPaciente` wrapper; it needs `logAction`, defined one layer up.
