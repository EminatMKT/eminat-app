import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { usePacientes } from '../usePacientes'
import usePatientDashboardAggregate from '../usePatientDashboardAggregate'
import pacienteFixture from '../usePacientes/fixture'
import type { Paciente } from '@/features/medical/types'
import usePatientManagement from './index'

vi.mock('../usePacientes', () => ({ usePacientes: vi.fn() }))
vi.mock('../usePatientDashboardAggregate', () => ({ default: vi.fn() }))

const inactiveOverrides: Partial<Paciente> = { id: 'p2', estado: 'inactivo' }
const activePatient = pacienteFixture()
const inactivePatient = pacienteFixture(inactiveOverrides)

const registryApi = {
  pacientes: [activePatient, inactivePatient],
  pacienteFuentes: [],
  pacienteContactos: [],
  loading: false,
  loaded: true,
  recargar: vi.fn(),
  ensureLoaded: vi.fn(),
  addLocal: vi.fn(),
  updateLocal: vi.fn(),
  addPaciente: vi.fn(),
  editPaciente: vi.fn(),
  importarPacientes: vi.fn(),
}

const dashboardApi = {
  counts: null,
  loading: true,
  error: null,
  reload: vi.fn(),
}

let seen: ReturnType<typeof usePatientManagement> | null = null
function Probe() {
  seen = usePatientManagement()
  return null
}

describe('usePatientManagement', () => {
  beforeEach(() => {
    seen = null
    vi.mocked(usePacientes).mockReturnValue(registryApi)
    vi.mocked(usePatientDashboardAggregate).mockReturnValue(dashboardApi)
    renderToStaticMarkup(<Probe />)
  })

  it('forwards the registry and dashboard aggregate as its own contract', () => {
    expect(seen?.pacientes).toBe(registryApi.pacientes)
    expect(seen?.pacientesLoading).toBe(false)
    expect(seen?.pacientesLoaded).toBe(true)
    expect(seen?.ensurePacientesLoaded).toBe(registryApi.ensureLoaded)
    expect(seen?.addPacienteDb).toBe(registryApi.addPaciente)
    expect(seen?.patientDashboard).toBe(dashboardApi)
    expect(seen?.patientDashboard.error).toBeNull()
  })

  it('keeps only active patients in pacientesActivos', () => {
    expect(seen?.pacientesActivos).toEqual([activePatient])
  })

  it('starts the patient search and filter unset, matching every patient', () => {
    expect(seen?.searchPaciente).toBe('')
    expect(seen?.filterEstadoPaciente).toBe('todos')
    expect(seen?.filteredPacientes).toEqual(registryApi.pacientes)
  })
})
