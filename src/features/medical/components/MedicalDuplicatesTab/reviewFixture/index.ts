import pacienteFixture from '@/features/medical/hooks/usePacientes/fixture'
import type { Paciente } from '@/features/medical/types'
import type { PatientUnderReview } from '../types'

const NO_FIELDS: Partial<Paciente> = {}
const NO_CONTACTS: Partial<Omit<PatientUnderReview, 'paciente'>> = {}

/** A `PatientUnderReview` for tests: a valid patient with any field overridden, and no contacts
 *  unless given. */
export default function reviewFixture(
  fields: Partial<Paciente> = NO_FIELDS,
  contacts: Partial<Omit<PatientUnderReview, 'paciente'>> = NO_CONTACTS,
): PatientUnderReview {
  const review: PatientUnderReview = {
    paciente: pacienteFixture(fields),
    telefono: [],
    email: [],
    ...contacts,
  }
  return review
}

// Builds on `pacienteFixture` so a test states only the fields and contacts it is about.
