import type { Paciente, PacienteContacto } from '@/features/medical/types'

/** One contact row as the duplicate review shows it: which row, and what it says. */
export type ContactView = Pick<PacienteContacto, 'id' | 'valor'>

/** A patient loaded for the duplicate review: its row, plus every phone and email row it holds.
 *  The arrays are what make `CompareField` resolve these two fields with checkboxes. */
export type PatientUnderReview = { paciente: Paciente; telefono: ContactView[]; email: ContactView[] }
