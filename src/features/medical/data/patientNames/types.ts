import type { Paciente } from '@/features/medical/types'

/** The three columns a duplicate-list summary needs. */
export type PatientName = Pick<Paciente, 'id' | 'nombre' | 'apellido'>
