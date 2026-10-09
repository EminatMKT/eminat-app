import { ESTADO_PACIENTE_DEFAULT } from '@/features/medical/constants'
import type { Paciente } from '@/features/medical/types'

const BASE: Paciente = {
  id: 'p1',
  mrn: 'MRN1',
  nombre: 'Ana',
  apellido: 'Lopez',
  fecha_nacimiento: null,
  genero: null,
  telefono: null,
  email: null,
  seguro: null,
  seguro_id: null,
  direccion: null,
  estado: ESTADO_PACIENTE_DEFAULT,
  alergias: null,
  condiciones: null,
  notas: null,
  created_at: '',
  updated_at: '',
}
const NO_OVERRIDES: Partial<Paciente> = {}

/** A minimally valid `Paciente` for tests, with any field overridden. */
export default function pacienteFixture(overrides: Partial<Paciente> = NO_OVERRIDES): Paciente {
  const built: Paciente = { ...BASE, ...overrides }
  return built
}

// Shared across this hook's own test files so each one stops repeating all seventeen `Paciente`
// fields just to get one valid object.
