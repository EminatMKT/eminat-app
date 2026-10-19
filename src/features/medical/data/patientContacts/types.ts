import type { PacienteContacto } from '@/features/medical/types'

/** One `paciente_contactos` row as the duplicate review reads it. */
export type PatientContactRow = Pick<PacienteContacto, 'id' | 'tipo' | 'valor'>
